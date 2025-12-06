import { BarChartIcon, CameraIcon, HomeIcon, LockClosedIcon, RocketIcon, Share1Icon, TrashIcon } from '@radix-ui/react-icons';
import { CustomLink } from '../../../shared/components/link';
import { usePopupNav } from '../../../utils/navigate';
import { PopupPath } from '../paths';
import { DashboardGradientIcon } from '../../../icons/dashboard-gradient';
import { SettingsScreen } from './settings-screen';
import { Switch } from '@repo/ui/components/ui/switch';
import { useState, useEffect } from 'react';
import { localExtStorage } from '@repo/storage-chrome/local';

const links = [
  {
    title: 'Trading Mode',
    icon: <RocketIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_TRADING_MODE,
  },
  {
    title: 'Network Provider',
    icon: <Share1Icon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_RPC,
  },
  {
    title: 'Default Frontend',
    icon: <HomeIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_DEFAULT_FRONTEND,
  },
  {
    title: 'Price Denomination',
    icon: <BarChartIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_NUMERAIRES,
  },
  {
    title: 'Airgap Signer',
    icon: <CameraIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_AIRGAP_SIGNER,
  },
  {
    title: 'Clear Cache',
    icon: <TrashIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_CLEAR_CACHE,
  },
];

const SecuritySection = () => {
  const [requireLogin, setRequireLogin] = useState(true);

  useEffect(() => {
    void localExtStorage.get('requireLoginForViewingKey').then(value => {
      setRequireLogin(value ?? true);
    });
  }, []);

  const handleToggle = (checked: boolean) => {
    setRequireLogin(checked);
    void localExtStorage.set('requireLoginForViewingKey', checked);
  };

  return (
    <div className='mt-4 pt-4 border-t border-border'>
      <div className='flex items-center gap-2 mb-3'>
        <LockClosedIcon className='size-4 text-muted-foreground' />
        <span className='text-sm font-medium'>Security</span>
      </div>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col gap-1'>
          <span className='text-sm'>Require login for viewing</span>
          <span className='text-xs text-muted-foreground'>
            {requireLogin
              ? 'DApps cannot read balances while locked'
              : 'DApps can read balances without login'}
          </span>
        </div>
        <Switch checked={requireLogin} onCheckedChange={handleToggle} />
      </div>
    </div>
  );
};

const BuildInfoSection = () => (
  <div className='mt-auto pt-6 border-t border-border'>
    <div className='text-xs text-muted-foreground space-y-1'>
      <div className='font-medium text-foreground/70'>Build Info</div>
      <div className='font-mono'>
        prax: {BUILD_INFO.prax.commit.slice(0, 8)}{' '}
        <span className='text-muted-foreground/60'>({BUILD_INFO.prax.branch})</span>
      </div>
      <div className='font-mono'>
        web: {BUILD_INFO.penumbraWeb.commit.slice(0, 8)}{' '}
        <span className='text-muted-foreground/60'>({BUILD_INFO.penumbraWeb.branch})</span>
      </div>
      <div className='text-muted-foreground/50'>{new Date(BUILD_INFO.buildTime).toLocaleString()}</div>
    </div>
  </div>
);

export const SettingsAdvanced = () => {
  const navigate = usePopupNav();

  return (
    <SettingsScreen title='Advanced' IconComponent={DashboardGradientIcon}>
      <div className='flex flex-1 flex-col items-start gap-2'>
        {links.map(i => (
          <CustomLink key={i.href} title={i.title} icon={i.icon} onClick={() => navigate(i.href)} />
        ))}
      </div>
      <SecuritySection />
      <BuildInfoSection />
    </SettingsScreen>
  );
};
