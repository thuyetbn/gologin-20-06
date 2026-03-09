
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Folder, Loader2, Monitor, RefreshCw, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface BrowserStatus {
  isInstalled: boolean;
  lastChecked: string;
}

interface BrowserInfo {
  version: string;
  majorVersion: string;
  storagePath: string;
  isInstalled: boolean;
  executablePath: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  updateInfo?: {
    currentVersion: string;
    latestVersion: string;
    currentMajorVersion: string;
    latestMajorVersion: string;
  };
  message: string;
}

const BrowserManagement: React.FC = () => {
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>({
    isInstalled: true,
    lastChecked: new Date().toLocaleString('vi-VN')
  });

  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);

  // Load browser info
  const loadBrowserInfo = async () => {
    try {
      if (typeof window !== 'undefined' && window.api) {
        const info = await window.api.invoke('browser:get-info');
        setBrowserInfo(info);
        setBrowserStatus(prev => ({
          ...prev,
          isInstalled: info.isInstalled,
          lastChecked: new Date().toLocaleString('vi-VN')
        }));
      }
    } catch (error) {
      console.error('Failed to load browser info:', error);
      toast.error("Không thể tải thông tin browser");
    }
  };

  // Check for browser updates
  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.invoke('browser:check-for-updates');
        setCheckResult(result);
        setBrowserStatus(prev => ({
          ...prev,
          lastChecked: new Date().toLocaleString('vi-VN')
        }));
        if (result.success && result.hasUpdate) {
          toast.info(`Có bản cập nhật mới! Version ${result.updateInfo?.latestVersion}`);
        } else if (result.success && !result.hasUpdate) {
          toast.success("Browser đang ở phiên bản mới nhất");
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error('Check for updates failed:', error);
      toast.error("Kiểm tra cập nhật thất bại");
    } finally {
      setIsChecking(false);
    }
  };

  // Update browser with progress window
  const handleUpdateWithProgress = async () => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.invoke('browser:update-with-progress');
        
        if (result.success) {
          toast.success(`Browser đã được cập nhật lên version ${result.newVersion}`);
          
          // Refresh browser info after update
          await loadBrowserInfo();
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error('Update with progress failed:', error);
      toast.error("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Refresh browser info
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBrowserInfo();
    setIsRefreshing(false);
  };

  // Open storage folder
  const openStorageFolder = () => {
    if (browserInfo?.storagePath && typeof window !== 'undefined' && window.api) {
      window.api.invoke('shell:open-path', browserInfo.storagePath);
    }
  };

  useEffect(() => {
    // Load initial browser info
    loadBrowserInfo();

    // Auto-refresh status every 30 seconds
    const interval = setInterval(() => {
      setBrowserStatus(prev => ({
        ...prev,
        lastChecked: new Date().toLocaleString('vi-VN')
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản Lý Browser</h1>
          <p className="text-muted-foreground mt-2">Quản lý và cập nhật Orbita Browser</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Làm mới
        </Button>
      </div>
      
      {/* Browser Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Thông Tin Browser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Trạng thái cài đặt</span>
              <Badge variant={browserInfo?.isInstalled ? "default" : "destructive"}>
                {browserInfo?.isInstalled ? "Đã cài đặt" : "Chưa cài đặt"}
              </Badge>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Version hiện tại</span>
              <span className="text-sm font-mono">{browserInfo?.version || 'Không xác định'}</span>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Major Version</span>
              <span className="text-sm font-mono">{browserInfo?.majorVersion || 'Không xác định'}</span>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Thư mục lưu trữ</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono truncate flex-1" title={browserInfo?.storagePath}>
                  {browserInfo?.storagePath || 'Không xác định'}
                </span>
                <Button 
                  onClick={openStorageFolder}
                  variant="outline" 
                  size="sm"
                  disabled={!browserInfo?.storagePath}
                >
                  <Folder className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Đường dẫn thực thi</span>
              <span className="text-xs font-mono truncate" title={browserInfo?.executablePath}>
                {browserInfo?.executablePath || 'Không xác định'}
              </span>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Kiểm tra lần cuối</span>
              <span className="text-sm font-mono">{browserStatus.lastChecked}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Browser Update Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-500" />
            Cập Nhật Browser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <h4 className="font-medium">Kiểm tra và cập nhật Browser</h4>
              <p className="text-sm text-muted-foreground">
                Kiểm tra phiên bản mới nhất và cập nhật Orbita Browser
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCheckForUpdates}
                disabled={isChecking || isUpdating}
                variant="outline"
                size="lg"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}
              </Button>

              <Button
                onClick={handleUpdateWithProgress}
                disabled={isUpdating || isChecking}
                variant="default"
                size="lg"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isUpdating ? 'Đang cập nhật...' : 'Cập nhật Browser'}
              </Button>
            </div>
          </div>

          {/* Check Result */}
          {checkResult && (
            <div className={`p-3 rounded-lg border ${
              checkResult.hasUpdate
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            }`}>
              {checkResult.hasUpdate ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Có bản cập nhật mới!
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{checkResult.updateInfo?.currentVersion}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="default">{checkResult.updateInfo?.latestVersion}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Browser đang ở phiên bản mới nhất
                </p>
              )}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="space-y-1">
              <p>• <strong>Tự động kiểm tra:</strong> Ứng dụng sẽ tự động kiểm tra version mới khi khởi động</p>
              <p>• <strong>Thông báo cập nhật:</strong> Sẽ có popup và badge "NEW" ở sidebar khi có version mới</p>
              <p>• <strong>Tiến trình cập nhật:</strong> Hiển thị cửa sổ với thanh tiến trình khi cập nhật</p>
              <p>• <strong>Tự động cài đặt:</strong> Browser mới sẽ được tự động cài đặt sau khi download</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Update Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Trạng Thái Auto-Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Trạng thái hoạt động</span>
              <Badge variant="default">
                Đang hoạt động
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserManagement; 