import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SetupState {
  isSetupRequired: boolean;
  isLoading: boolean;
  dataPath: string | null;
  setupError: string | null;
}

export const useSetupCheck = (skipRedirect?: boolean) => {
  const router = useRouter();
  const [setupState, setSetupState] = useState<SetupState>({
    isSetupRequired: false,
    isLoading: true,
    dataPath: null,
    setupError: null
  });

  useEffect(() => {
    let mounted = true;
    let handleSetupRequired: ((_event: unknown, data: { message: string }) => void) | null = null;
    let handleSetupError: ((_event: unknown, data: { message: string }) => void) | null = null;

    const checkSetup = async () => {
      try {
        if (typeof window !== 'undefined' && window.api) {
          // Get current settings from store
          const settings = await window.api.invoke('settings:get');
          const dataPath = settings?.dataPath;

          console.log('Setup check - dataPath:', dataPath);

          const isSetupRequired = !dataPath || dataPath.trim() === '';
          
          if (mounted) {
            setSetupState({
              isSetupRequired,
              isLoading: false,
              dataPath: dataPath || null,
              setupError: null
            });

            // Redirect to settings if setup required and not already on settings page
            if (isSetupRequired && !skipRedirect && router.pathname !== '/settings') {
              console.log('Setup required, redirecting to settings...', {
                isSetupRequired,
                skipRedirect,
                pathname: router.pathname,
                dataPath
              });
              // Use setTimeout to ensure router is ready
              setTimeout(() => {
                router.replace('/settings?setup=required');
              }, 100);
            }
          }
        } else {
          if (mounted) {
            setSetupState({
              isSetupRequired: true,
              isLoading: false,
              dataPath: null,
              setupError: null
            });
          }
        }
      } catch (error) {
        console.error('Error checking setup:', error);
        if (mounted) {
          setSetupState({
            isSetupRequired: true,
            isLoading: false,
            dataPath: null,
            setupError: 'Không thể kiểm tra trạng thái cài đặt'
          });

          // Redirect to settings on error
          if (!skipRedirect && router.pathname !== '/settings') {
            setTimeout(() => {
              router.replace('/settings?setup=required');
            }, 100);
          }
        }
      }
    };

    // Setup event listeners for backend notifications
    const setupEventListeners = () => {
      if (typeof window !== 'undefined' && window.api) {
        // Listen for setup-required events from backend
        handleSetupRequired = (_event: unknown, data: { message: string }) => {
          console.log('Backend setup-required event:', data);
          if (mounted) {
            setSetupState(prev => ({
              ...prev,
              isSetupRequired: true,
              isLoading: false,
              setupError: null
            }));

            // Redirect to settings if not already there
            if (!skipRedirect && router.pathname !== '/settings') {
              setTimeout(() => {
                router.replace('/settings?setup=required');
              }, 100);
              toast.warning('Yêu cầu cài đặt: ' + data.message);
            }
          }
        };

        // Listen for setup-error events from backend
        handleSetupError = (_event: unknown, data: { message: string }) => {
          console.error('Backend setup-error event:', data);
          toast.error('Lỗi cài đặt: ' + data.message);

          if (mounted) {
            setSetupState(prev => ({
              ...prev,
              isSetupRequired: true,
              isLoading: false,
              setupError: 'Lỗi cài đặt: ' + data.message
            }));

            // Redirect to settings on error
            if (!skipRedirect && router.pathname !== '/settings') {
              setTimeout(() => {
                router.replace('/settings?setup=required');
              }, 100);
            }
          }
        };

        window.api.on('setup-required', handleSetupRequired);
        window.api.on('setup-error', handleSetupError);
      }
    };

    // Initial setup check
    checkSetup();
    setupEventListeners();

    // Cleanup function
    return () => {
      mounted = false;
      if (typeof window !== 'undefined' && window.api) {
        if (handleSetupRequired) {
          window.api.removeListener('setup-required', handleSetupRequired);
        }
        if (handleSetupError) {
          window.api.removeListener('setup-error', handleSetupError);
        }
      }
    };
  }, [router, skipRedirect]);

  return setupState;
}; 