
import ContentLoading from '@/components/content-loading';
import { useSetupCheck } from '@/hooks/use-setup-check';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';

interface SetupGuardProps {
  children: ReactNode;
  requireSetup?: boolean;
}

const SetupGuard = ({ children, requireSetup = true }: SetupGuardProps) => {
  const router = useRouter();
  const { isSetupRequired, isLoading, dataPath } = useSetupCheck(false); // Explicitly enable redirect

  // Show loading while checking setup
  if (isLoading) {
    return <ContentLoading type="page" message="Đang kiểm tra cài đặt..." />;
  }

  // If setup is required, let useSetupCheck handle the redirect
  // Only show fallback UI if we're on settings page and setup is still required
  if (requireSetup && isSetupRequired && router.pathname === '/settings') {
    // We're on settings page but setup is still required - let the settings page handle it
    return <>{children}</>;
  }

  // If setup is required but we're not on settings page, show brief loading while redirect happens
  if (requireSetup && isSetupRequired) {
    return <ContentLoading type="page" message="Đang chuyển đến trang cài đặt..." />;
  }

  // Setup completed or not required, render children
  return <>{children}</>;
};

export default SetupGuard; 