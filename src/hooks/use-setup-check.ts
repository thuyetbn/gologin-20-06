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

    const checkSetup = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).api) {
          // Get current settings from store
          const settings = await (window as any).api.invoke('settings:get');
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
              console.log('Setup required, redirecting to settings...');
              router.replace('/settings?setup=required');
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
            setupError: 'Failed to check setup status'
          });

          // Redirect to settings on error
          if (!skipRedirect && router.pathname !== '/settings') {
            router.replace('/settings?setup=required');
          }
        }
      }
    };

    // Setup event listeners for backend notifications
    const setupEventListeners = () => {
      if (typeof window !== 'undefined' && (window as any).api) {
        // Listen for setup-required events from backend
        (window as any).api.on('setup-required', (event: any, data: any) => {
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
              router.replace('/settings?setup=required');
              toast.warning('Setup required: ' + data.message);
            }
          }
        });

        // Listen for setup-error events from backend  
        (window as any).api.on('setup-error', (event: any, data: any) => {
          console.error('Backend setup-error event:', data);
          toast.error('Setup Error: ' + data.message);
          
          if (mounted) {
            setSetupState(prev => ({
              ...prev,
              isSetupRequired: true,
              isLoading: false,
              setupError: 'Setup Error: ' + data.message
            }));

            // Redirect to settings on error
            if (!skipRedirect && router.pathname !== '/settings') {
              router.replace('/settings?setup=required');
            }
          }
        });
      }
    };

    // Initial setup check
    checkSetup();
    setupEventListeners();

    // Cleanup function
    return () => {
      mounted = false;
      // Note: removeAllListeners is not available in our API
      // The listeners will be cleaned up when the component unmounts
    };
  }, [router, skipRedirect]);

  return setupState;
}; 