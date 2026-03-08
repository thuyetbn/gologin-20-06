
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Download, Folder, Loader2, Monitor, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BrowserStatus {
  isInstalled: boolean;
  autoUpdateEnabled: boolean;
  lastChecked: string;
}

interface BrowserInfo {
  version: string;
  majorVersion: string;
  storagePath: string;
  isInstalled: boolean;
  executablePath: string;
}

const BrowserManagement: React.FC = () => {
  const { toast } = useToast();
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>({
    isInstalled: true,
    autoUpdateEnabled: true,
    lastChecked: new Date().toLocaleString('vi-VN')
  });
  
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load browser info
  const loadBrowserInfo = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).api) {
        const info = await (window as any).api.invoke('browser:get-info');
        setBrowserInfo(info);
        setBrowserStatus(prev => ({
          ...prev,
          isInstalled: info.isInstalled,
          lastChecked: new Date().toLocaleString('vi-VN')
        }));
      }
    } catch (error) {
      console.error('Failed to load browser info:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin browser",
        variant: "destructive"
      });
    }
  };

  // Update browser with progress window
  const handleUpdateWithProgress = async () => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined' && (window as any).api) {
        const result = await (window as any).api.invoke('browser:update-with-progress');
        
        if (result.success) {
          toast({
            title: "Cập nhật thành công!", 
            description: `Browser đã được cập nhật lên version ${result.newVersion}`,
            variant: "default"
          });
          
          // Refresh browser info after update
          await loadBrowserInfo();
        } else {
          toast({
            title: "Lỗi cập nhật",
            description: result.message,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Update with progress failed:', error);
      toast({
        title: "Lỗi",
        description: "Cập nhật thất bại. Vui lòng thử lại.",
        variant: "destructive"
      });
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
    if (browserInfo?.storagePath && typeof window !== 'undefined' && (window as any).api) {
      (window as any).api.invoke('shell:open-path', browserInfo.storagePath);
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
          <h1 className="text-3xl font-bold">Browser Management</h1>
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
              <span className="text-sm font-mono">{browserInfo?.version || 'Unknown'}</span>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Major Version</span>
              <span className="text-sm font-mono">{browserInfo?.majorVersion || 'Unknown'}</span>
            </div>
            
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Thư mục lưu trữ</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono truncate flex-1" title={browserInfo?.storagePath}>
                  {browserInfo?.storagePath || 'Unknown'}
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
                {browserInfo?.executablePath || 'Unknown'}
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
              <h4 className="font-medium">Cập nhật Browser mới nhất</h4>
              <p className="text-sm text-muted-foreground">
                Tự động kiểm tra và cập nhật Orbita Browser khi có phiên bản mới
              </p>
            </div>
            
            <Button 
              onClick={handleUpdateWithProgress}
              disabled={isUpdating || !browserInfo?.isInstalled}
              variant="default"
              size="lg"
              className="min-w-[200px]"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isUpdating ? 'Đang cập nhật...' : 'Cập nhật Browser'}
            </Button>
          </div>
          
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
              <span className="text-sm text-muted-foreground">Tự động cập nhật</span>
              <Badge variant={browserStatus.autoUpdateEnabled ? "default" : "secondary"}>
                {browserStatus.autoUpdateEnabled ? "Đã bật" : "Đã tắt"}
              </Badge>
            </div>
            
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