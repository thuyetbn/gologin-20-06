import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  currentMajorVersion: string;
  latestMajorVersion: string;
}

export const useBrowserUpdate = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    // Listen for browser update notifications from main process
    const handleUpdateAvailable = (_event: unknown, info: UpdateInfo) => {
      console.log('Browser update available:', info);
      setHasUpdate(true);
      setUpdateInfo(info);
      setShowDialog(true);

      toast.info(`Có bản cập nhật Browser mới! Version ${info.latestVersion} đã có sẵn.`);
    };

    window.api.on('browser-update-available', handleUpdateAvailable);

    // Auto-check for browser updates on startup (delay 10s)
    const timer = setTimeout(() => {
      window.api.invoke('browser:check-for-updates').catch(() => {});
    }, 10000);

    return () => {
      clearTimeout(timer);
      window.api.removeListener('browser-update-available', handleUpdateAvailable);
    };
  }, []);

  const performUpdate = async (): Promise<void> => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.invoke('browser:update-with-progress');

        if (result.success) {
          toast.success(`Browser đã được cập nhật lên version ${result.newVersion}`);
          setHasUpdate(false);
          setUpdateInfo(null);
          setShowDialog(false);
        } else {
          toast.error(`Lỗi cập nhật: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    setShowDialog(false);
  };

  return {
    hasUpdate,
    updateInfo,
    showDialog,
    isUpdating,
    performUpdate,
    dismissUpdate,
    setShowDialog
  };
};
