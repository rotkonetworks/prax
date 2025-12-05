import type { LocalStorageState } from '@repo/storage-chrome/local';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import { AllSlices, SliceCreator } from '.';

export interface TradingModeSettings {
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
}

export interface TradingModeSlice {
  settings: TradingModeSettings;
  setAutoSign: (enabled: boolean) => void;
  addAllowedOrigin: (origin: string) => Promise<void>;
  removeAllowedOrigin: (origin: string) => Promise<void>;
  setSessionDuration: (minutes: number) => void;
  setMaxValuePerSwap: (value: string) => void;
  /** Start a new trading session (sets expiresAt based on sessionDurationMinutes) */
  startSession: () => void;
  /** End the current trading session */
  endSession: () => void;
  /** Check if session is currently active */
  isSessionActive: () => boolean;
  saveTradingMode: () => Promise<void>;
  /** Check if auto-sign is allowed for a given origin */
  canAutoSign: (origin?: string) => boolean;
}

const DEFAULT_SETTINGS: TradingModeSettings = {
  autoSign: false,
  allowedOrigins: [],
  sessionDurationMinutes: 30,
  expiresAt: 0,
  maxValuePerSwap: '0',
};

export const createTradingModeSlice =
  (local: ExtensionStorage<LocalStorageState>): SliceCreator<TradingModeSlice> =>
  (set, get) => {
    return {
      settings: DEFAULT_SETTINGS,

      setAutoSign: (enabled: boolean) => {
        set(state => {
          state.tradingMode.settings.autoSign = enabled;
          // If disabling, also end the session
          if (!enabled) {
            state.tradingMode.settings.expiresAt = 0;
          }
        });
      },

      addAllowedOrigin: async (origin: string) => {
        set(state => {
          if (!state.tradingMode.settings.allowedOrigins.includes(origin)) {
            state.tradingMode.settings.allowedOrigins.push(origin);
          }
        });
        // Auto-save after state update
        await local.set('tradingMode', get().tradingMode.settings);
      },

      removeAllowedOrigin: async (origin: string) => {
        set(state => {
          const idx = state.tradingMode.settings.allowedOrigins.indexOf(origin);
          if (idx >= 0) {
            state.tradingMode.settings.allowedOrigins.splice(idx, 1);
          }
        });
        // Auto-save after state update
        await local.set('tradingMode', get().tradingMode.settings);
      },

      setSessionDuration: (minutes: number) => {
        set(state => {
          state.tradingMode.settings.sessionDurationMinutes = Math.max(1, Math.min(480, minutes)); // 1 min to 8 hours
        });
      },

      setMaxValuePerSwap: (value: string) => {
        set(state => {
          state.tradingMode.settings.maxValuePerSwap = value;
        });
      },

      startSession: () => {
        set(state => {
          const durationMs = state.tradingMode.settings.sessionDurationMinutes * 60 * 1000;
          state.tradingMode.settings.expiresAt = Date.now() + durationMs;
        });
      },

      endSession: () => {
        set(state => {
          state.tradingMode.settings.expiresAt = 0;
        });
      },

      isSessionActive: () => {
        const { autoSign, expiresAt, allowedOrigins } = get().tradingMode.settings;
        // Session is active if:
        // 1. Auto-sign is enabled
        // 2. There's at least one allowed origin
        // 3. Session hasn't expired
        return autoSign && allowedOrigins.length > 0 && expiresAt > Date.now();
      },

      saveTradingMode: async () => {
        await local.set('tradingMode', get().tradingMode.settings);
      },

      canAutoSign: (origin?: string) => {
        const { autoSign, allowedOrigins, expiresAt } = get().tradingMode.settings;

        // Must have auto-sign enabled
        if (!autoSign) return false;

        // Must have at least one allowed origin configured
        if (allowedOrigins.length === 0) return false;

        // Session must not be expired
        if (expiresAt <= Date.now()) return false;

        // If origin provided, it must be in the allowed list
        if (origin && !allowedOrigins.includes(origin)) return false;

        return true;
      },
    };
  };

export const tradingModeSelector = (state: AllSlices) => state.tradingMode;
