export { type LOCAL, type SYNC, type VERSION };

type VERSION = 2;

type SYNC = void;

type LOCAL = {
  // required values
  knownSites: { choice: 'Approved' | 'Denied' | 'Ignored'; date: number; origin: string }[];
  /** Stringified AssetId */
  numeraires: string[];
  wallets: {
    custody: {
      /** BoxJson */
      encryptedSeedPhrase: { cipherText: string; nonce: string };
    };
    /** Stringified FullViewingKey */
    fullViewingKey: string;
    /** Stringified WalletId */
    id: string;
    label: string;
  }[];

  // optional values
  backupReminderSeen?: boolean;
  /**
   * Trading mode settings for CEX-like UX.
   * When enabled, allows faster trading with reduced confirmations.
   * Security: Only swaps are auto-signed, with origin whitelist and time limits.
   */
  tradingMode?: {
    /** Enable auto-sign for swap transactions */
    autoSign: boolean;
    /** Origins allowed to auto-sign (REQUIRED - empty means disabled) */
    allowedOrigins: string[];
    /** Session duration in minutes (default 30) */
    sessionDurationMinutes: number;
    /** When the current session expires (ms since epoch, 0 = not active) */
    expiresAt: number;
    /** Max value per swap in base staking units (0 = unlimited) */
    maxValuePerSwap: string;
  };
  /** integer */
  compactFrontierBlockHeight?: number;
  /** url string */
  frontendUrl?: string;
  /** integer */
  fullSyncHeight?: number;
  /** url string */
  grpcEndpoint?: string;
  /** Stringified AppParameters */
  params?: string;
  /** KeyPrintJson */
  passwordKeyPrint?: { hash: string; salt: string };
  /** integer */
  walletCreationBlockHeight?: number;
  /** boolean */
  airgapSignerCameraEnabled?: boolean;
  /**
   * Security: Require login before exposing viewing key to dApps.
   * When true (default), dApps cannot read balances/transactions while locked.
   * When false, viewing key is accessible without login (convenience mode).
   */
  requireLoginForViewingKey?: boolean;
};
