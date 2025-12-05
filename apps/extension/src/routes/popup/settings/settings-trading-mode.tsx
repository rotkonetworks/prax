import { useStore } from '../../../state';
import { tradingModeSelector } from '../../../state/trading-mode';
import { connectedSitesSelector } from '../../../state/connected-sites';
import { SettingsScreen } from './settings-screen';
import { Switch } from '@repo/ui/components/ui/switch';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { TimerGradientIcon } from '../../../icons/time-gradient';
import { useState, useEffect } from 'react';
import { Cross1Icon } from '@radix-ui/react-icons';

export const SettingsTradingMode = () => {
  const {
    settings,
    setAutoSign,
    addAllowedOrigin,
    removeAllowedOrigin,
    setSessionDuration,
    setMaxValuePerSwap,
    startSession,
    endSession,
    isSessionActive,
    saveTradingMode,
  } = useStore(tradingModeSelector);

  const { knownSites } = useStore(connectedSitesSelector);
  const approvedSites = knownSites.filter(s => s.choice === 'Approved');

  const [saving, setSaving] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update time remaining every second
  useEffect(() => {
    const updateTimer = () => {
      if (settings.expiresAt > Date.now()) {
        const remaining = settings.expiresAt - Date.now();
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining('');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings.expiresAt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTradingMode();
    } finally {
      setSaving(false);
    }
  };

  const handleStartSession = async () => {
    startSession();
    await saveTradingMode();
  };

  const handleEndSession = async () => {
    endSession();
    await saveTradingMode();
  };

  const sessionActive = isSessionActive();

  return (
    <SettingsScreen title='Trading Mode' IconComponent={TimerGradientIcon}>
      <div className='flex flex-col gap-4'>
        <div className='text-sm text-muted-foreground'>
          Enable trading mode for CEX-like swap experience. Only swap transactions from whitelisted
          origins can be auto-signed.
        </div>

        {/* Session Status */}
        {sessionActive && (
          <div className='rounded-lg border border-green-500/50 bg-green-500/10 p-3'>
            <div className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <span className='font-medium text-green-500'>Session Active</span>
                <span className='text-xs text-muted-foreground'>
                  Expires in {timeRemaining}
                </span>
              </div>
              <Button variant='outline' size='sm' onClick={handleEndSession}>
                End Session
              </Button>
            </div>
          </div>
        )}

        {/* Auto-sign Toggle */}
        <div className='rounded-lg border border-border bg-background p-3'>
          <div className='flex items-center justify-between'>
            <div className='flex flex-col gap-1'>
              <span className='font-medium'>Auto-sign swaps</span>
              <span className='text-xs text-muted-foreground'>
                Only swap transactions are auto-signed
              </span>
            </div>
            <Switch
              checked={settings.autoSign}
              onCheckedChange={checked => {
                setAutoSign(checked);
              }}
            />
          </div>
        </div>

        {settings.autoSign && (
          <>
            {/* Session Duration */}
            <div className='rounded-lg border border-border bg-background p-3'>
              <div className='flex flex-col gap-2'>
                <span className='font-medium'>Session Duration</span>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min={1}
                    max={480}
                    value={settings.sessionDurationMinutes}
                    onChange={e => setSessionDuration(parseInt(e.target.value) || 30)}
                    className='w-20'
                  />
                  <span className='text-sm text-muted-foreground'>minutes</span>
                </div>
                <span className='text-xs text-muted-foreground'>
                  Auto-sign expires after this duration (1-480 min)
                </span>
              </div>
            </div>

            {/* Max Value */}
            <div className='rounded-lg border border-border bg-background p-3'>
              <div className='flex flex-col gap-2'>
                <span className='font-medium'>Max Value Per Swap</span>
                <div className='flex items-center gap-2'>
                  <Input
                    type='text'
                    value={settings.maxValuePerSwap === '0' ? '' : settings.maxValuePerSwap}
                    onChange={e => setMaxValuePerSwap(e.target.value || '0')}
                    placeholder='0 (unlimited)'
                    className='flex-1'
                  />
                  <span className='text-sm text-muted-foreground'>base units</span>
                </div>
                <span className='text-xs text-muted-foreground'>
                  Maximum input value per auto-signed swap (0 = no limit)
                </span>
              </div>
            </div>

            {/* Allowed Origins */}
            <div className='rounded-lg border border-border bg-background p-3'>
              <div className='flex flex-col gap-2'>
                <span className='font-medium'>Allowed Origins</span>
                <span className='text-xs text-muted-foreground'>
                  Only these sites can auto-sign swaps. At least one is required.
                </span>

                {settings.allowedOrigins.length === 0 && (
                  <div className='rounded border border-yellow-500/50 bg-yellow-500/10 p-2 text-xs text-yellow-500'>
                    No origins selected. Auto-sign will not work until you add at least one.
                  </div>
                )}

                <div className='flex flex-col gap-1'>
                  {settings.allowedOrigins.map(origin => (
                    <div
                      key={origin}
                      className='flex items-center justify-between rounded bg-secondary/50 px-2 py-1'
                    >
                      <span className='text-sm truncate'>{origin}</span>
                      <button
                        onClick={() => removeAllowedOrigin(origin)}
                        className='text-muted-foreground hover:text-destructive'
                      >
                        <Cross1Icon className='size-3' />
                      </button>
                    </div>
                  ))}
                </div>

                {approvedSites.length > 0 && (
                  <div className='flex flex-col gap-1 mt-2'>
                    <span className='text-xs text-muted-foreground'>Add from connected sites:</span>
                    <div className='flex flex-wrap gap-1'>
                      {approvedSites
                        .filter(s => !settings.allowedOrigins.includes(s.origin))
                        .map(site => (
                          <button
                            key={site.origin}
                            onClick={() => addAllowedOrigin(site.origin)}
                            className='rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/80'
                          >
                            + {new URL(site.origin).hostname}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className='rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3'>
              <div className='flex flex-col gap-1'>
                <span className='font-medium text-yellow-500'>Security Notice</span>
                <span className='text-xs text-muted-foreground'>
                  Trading mode only auto-signs swap transactions from whitelisted origins during an
                  active session. Sends, withdrawals, and other transaction types always require
                  manual approval.
                </span>
              </div>
            </div>

            {/* Start Session / Save */}
            <div className='flex gap-2'>
              <Button onClick={handleSave} disabled={saving} variant='outline' className='flex-1'>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              {!sessionActive && settings.allowedOrigins.length > 0 && (
                <Button onClick={handleStartSession} className='flex-1'>
                  Start Session
                </Button>
              )}
            </div>
          </>
        )}

        {!settings.autoSign && (
          <Button onClick={handleSave} disabled={saving} className='mt-2'>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
      </div>
    </SettingsScreen>
  );
};
