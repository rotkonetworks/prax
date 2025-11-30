import { Code, ConnectError } from '@connectrpc/connect';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { Key } from '@repo/encryption/key';
import { localExtStorage } from '@repo/storage-chrome/local';
import { UserChoice } from '@repo/storage-chrome/records';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { Wallet } from '@repo/wallet';
import { PopupType } from '../message/popup';
import { throwIfNeedsLogin } from '../needs-login';
import { popup } from '../popup';

/**
 * Check if a transaction plan contains ONLY swap actions.
 * For security, we only auto-sign swaps - not sends, withdrawals, delegations, etc.
 */
const isSwapOnlyTransaction = (plan: TransactionPlan): boolean => {
  // Must have at least one action
  if (plan.actions.length === 0) return false;

  for (const action of plan.actions) {
    const actionCase = action.action.case;

    // Allow swap and swapClaim actions
    if (actionCase === 'swap' || actionCase === 'swapClaim') {
      continue;
    }

    // Allow spend/output that are part of swap mechanics
    // (swaps need to spend input and create outputs)
    if (actionCase === 'spend' || actionCase === 'output') {
      continue;
    }

    // Disallow all other action types:
    // - 'delegate', 'undelegate', 'undelegateClaim'
    // - 'validatorDefinition', 'ibcRelayAction'
    // - 'proposalSubmit', 'proposalWithdraw', 'proposalDepositClaim'
    // - 'validatorVote', 'delegatorVote'
    // - 'positionOpen', 'positionClose', 'positionWithdraw'
    // - 'communityPoolSpend', 'communityPoolOutput', 'communityPoolDeposit'
    // - 'ics20Withdrawal'
    // etc.
    return false;
  }

  // Must have at least one swap action to be considered a swap transaction
  const hasSwap = plan.actions.some(
    a => a.action.case === 'swap' || a.action.case === 'swapClaim',
  );

  return hasSwap;
};

/**
 * Calculate the total input value of a transaction in base staking units.
 * Used for enforcing max value limits.
 */
const calculateTotalInputValue = (plan: TransactionPlan): bigint => {
  let total = 0n;

  for (const action of plan.actions) {
    if (action.action.case === 'spend') {
      const note = action.action.value.note;
      if (note?.value?.amount) {
        // Add up all spend amounts
        // Note: This is a simplified calculation - in production you'd want to
        // check if this is the staking token and convert other assets to staking token value
        total += note.value.amount.lo + (note.value.amount.hi << 64n);
      }
    }
  }

  return total;
};

interface AutoSignCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Comprehensive check for whether a transaction can be auto-signed.
 * Enforces all security requirements:
 * 1. Auto-sign must be enabled
 * 2. Session must not be expired
 * 3. Origin must be in whitelist (whitelist is REQUIRED)
 * 4. Transaction must be swap-only
 * 5. Value must be within limits
 */
const canAutoSign = async (
  plan: TransactionPlan,
  origin?: string,
): Promise<AutoSignCheckResult> => {
  const tradingMode = await localExtStorage.get('tradingMode');

  // Check 1: Auto-sign must be enabled
  if (!tradingMode?.autoSign) {
    return { allowed: false, reason: 'Auto-sign is disabled' };
  }

  // Check 2: Must have allowed origins configured (security requirement)
  if (!tradingMode.allowedOrigins || tradingMode.allowedOrigins.length === 0) {
    return { allowed: false, reason: 'No allowed origins configured' };
  }

  // Check 3: Session must not be expired
  if (!tradingMode.expiresAt || tradingMode.expiresAt <= Date.now()) {
    return { allowed: false, reason: 'Trading session has expired' };
  }

  // Check 4: Origin must be in whitelist
  if (!origin) {
    return { allowed: false, reason: 'Origin not provided' };
  }
  if (!tradingMode.allowedOrigins.includes(origin)) {
    return { allowed: false, reason: `Origin ${origin} not in whitelist` };
  }

  // Check 5: Transaction must be swap-only
  if (!isSwapOnlyTransaction(plan)) {
    return { allowed: false, reason: 'Transaction contains non-swap actions' };
  }

  // Check 6: Value must be within limits (if limit is set)
  if (tradingMode.maxValuePerSwap && tradingMode.maxValuePerSwap !== '0') {
    const maxValue = BigInt(tradingMode.maxValuePerSwap);
    const txValue = calculateTotalInputValue(plan);
    if (txValue > maxValue) {
      return {
        allowed: false,
        reason: `Transaction value ${txValue} exceeds limit ${maxValue}`,
      };
    }
  }

  return { allowed: true };
};

export const getAuthorization = async (
  plan: TransactionPlan,
  origin?: string,
): Promise<AuthorizationData> => {
  const authorize = openWallet()
    .then(custody => custody.authorizePlan(plan))
    .catch(error => {
      console.error(error);
      throw new ConnectError('Authorization failed', Code.Internal);
    });

  // Check if auto-sign is allowed for this transaction
  const autoSignCheck = await canAutoSign(plan, origin);

  if (autoSignCheck.allowed) {
    // Auto-approve swap in trading mode
    console.log('[TradingMode] Auto-signing swap for origin:', origin);
    return authorize;
  }

  // Log why auto-sign was denied (for debugging)
  if (origin) {
    console.log('[TradingMode] Auto-sign denied:', autoSignCheck.reason);
  }

  // Show approval popup as normal
  const choose = popup(PopupType.TxApproval, {
    authorizeRequest: new AuthorizeRequest({ plan }).toJson() as Jsonified<AuthorizeRequest>,
  })
    .then(response => response?.choice === UserChoice.Approved)
    .catch(error => {
      console.error(error);
      throw new ConnectError('Approval failed', Code.Internal);
    });

  const [authorizationData, approval] = await Promise.all([authorize, choose]);

  if (!approval) {
    throw new ConnectError('Authorization denied', Code.PermissionDenied);
  }

  return authorizationData;
};

const openWallet = async () => {
  await throwIfNeedsLogin();

  const passKey = sessionExtStorage
    .get('passwordKey')
    .then(passKeyJson => Key.fromJson(passKeyJson!));

  const wallet = localExtStorage.get('wallets').then(wallets => Wallet.fromJson(wallets[0]!));

  return (await wallet).custody(await passKey);
};
