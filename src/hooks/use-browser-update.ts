import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  currentMajorVersion: string;
  latestMajorVersion: string;
}

export const useBrowserUpdate = () => {
  const { toast } = useToast();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for browser update notifications from main process
    if (typeof window !== 'undefined' && (window as any).api) {
      const handleUpdateAvailable = (event: any, info: UpdateInfo) => {
        console.log('Browser update available:', info);
        setHasUpdate(true);
        setUpdateInfo(info);
        setShowDialog(true);
        
        // Show toast notification
        toast({
          title: "🆕 Có bản cập nhật Browser mới!",
          description: `Version ${info.latestVersion} đã có sẵn. Click để cập nhật.`,
          variant: "default",
          duration: 8000,
        });
      };

      (window as any).api.on('browser-update-available', handleUpdateAvailable);

      return () => {
        // Cleanup listener if supported
        if ((window as any).api.removeListener) {
          (window as any).api.removeListener('browser-update-available', handleUpdateAvailable);
        }
      };
    }
  }, [toast]);

  const performUpdate = async (): Promise<void> => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined' && (window as any).api) {
        const result = await (window as any).api.invoke('browser:update-with-progress');
        
        if (result.success) {
          toast({
            title: "🎉 Cập nhật thành công!",
            description: `Browser đã được cập nhật lên version ${result.newVersion}`,
            variant: "default",
          });
          
          // Reset update state
          setHasUpdate(false);
          setUpdateInfo(null);
          setShowDialog(false);
        } else {
          toast({
            title: "❌ Lỗi cập nhật",
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast({
        title: "❌ Lỗi",
        description: "Cập nhật thất bại. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    setShowDialog(false);
    // Keep hasUpdate true to show the badge until next app restart
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