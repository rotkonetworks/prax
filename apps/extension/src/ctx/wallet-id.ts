import { WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { Code, ConnectError } from '@connectrpc/connect';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';

export const getWalletId = async () => {
  // Check if login is required for wallet access (default: true for security)
  const requireLogin = (await localExtStorage.get('requireLoginForViewingKey')) ?? true;

  if (requireLogin) {
    const loggedIn = await sessionExtStorage.get('passwordKey');
    if (!loggedIn) {
      throw new ConnectError(
        'Wallet is locked. Please unlock to access wallet.',
        Code.Unauthenticated,
      );
    }
  }

  const wallet0 = (await localExtStorage.get('wallets'))[0];
  if (!wallet0) {
    throw new ConnectError('No wallet available', Code.FailedPrecondition);
  }

  return WalletId.fromJsonString(wallet0.id);
};
