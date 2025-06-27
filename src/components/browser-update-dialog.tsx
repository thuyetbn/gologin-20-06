import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Download } from "lucide-react";
import { useEffect, useState } from "react";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  currentMajorVersion: string;
  latestMajorVersion: string;
}

interface BrowserUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateInfo: UpdateInfo | null;
  onUpdate: () => Promise<void>;
  isUpdating: boolean;
}

interface ProgressState {
  stage: 'idle' | 'checking' | 'downloading' | 'extracting' | 'installing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export function BrowserUpdateDialog({
  open,
  onOpenChange,
  updateInfo,
  onUpdate,
  isUpdating
}: BrowserUpdateDialogProps) {
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'idle',
    progress: 0,
    message: ''
  });

  // Listen for progress updates from backend
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).api) {
      const handleProgress = (event: any, data: { stage: string; progress: number; message: string; error?: string }) => {
        setProgressState({
          stage: data.stage as ProgressState['stage'],
          progress: data.progress || 0,
          message: data.message || '',
          error: data.error
        });
      };

      (window as any).api.on('browser-update-progress', handleProgress);

      return () => {
        // Note: removeListener not available, will cleanup when component unmounts
      };
    }
  }, []);

  const handleUpdate = async () => {
    setProgressState({
      stage: 'checking',
      progress: 0,
      message: 'Bắt đầu cập nhật...'
    });

    try {
      await onUpdate();
    } catch (error) {
      setProgressState({
        stage: 'error',
        progress: 0,
        message: 'Cập nhật thất bại',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleClose = () => {
    if (progressState.stage === 'completed' || progressState.stage === 'error' || progressState.stage === 'idle') {
      setProgressState({ stage: 'idle', progress: 0, message: '' });
      onOpenChange(false);
    }
  };

  const getStageText = (stage: ProgressState['stage']) => {
    switch (stage) {
      case 'checking': return 'Đang kiểm tra...';
      case 'downloading': return 'Đang tải xuống...';
      case 'extracting': return 'Đang giải nén...';
      case 'installing': return 'Đang cài đặt...';
      case 'completed': return 'Hoàn thành!';
      case 'error': return 'Lỗi!';
      default: return '';
    }
  };

  const isInProgress = ['checking', 'downloading', 'extracting', 'installing'].includes(progressState.stage);
  const isCompleted = progressState.stage === 'completed';
  const hasError = progressState.stage === 'error';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : hasError ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Download className="h-5 w-5 text-blue-500" />
            )}
            {isCompleted ? 'Cập nhật hoàn thành!' : hasError ? 'Cập nhật thất bại!' : 'Có bản cập nhật mới!'}
          </DialogTitle>
          
          {!isInProgress && !isCompleted && !hasError && updateInfo && (
            <DialogDescription>
              Phiên bản Orbita Browser mới đã có sẵn. Bạn có muốn cập nhật ngay không?
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Version Info - Only show when not in progress */}
        {!isInProgress && !isCompleted && !hasError && updateInfo && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Phiên bản hiện tại</div>
                <div className="font-medium">{updateInfo.currentVersion}</div>
              </div>
              <Badge variant="outline">v{updateInfo.currentMajorVersion}</Badge>
            </div>

            <div className="text-center">
              <div className="text-2xl">↓</div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Phiên bản mới nhất</div>
                <div className="font-medium">{updateInfo.latestVersion}</div>
              </div>
              <Badge variant="default" className="bg-green-600">v{updateInfo.latestMajorVersion}</Badge>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                🌟 Lợi ích khi cập nhật:
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Cải thiện hiệu suất và tốc độ</li>
                <li>• Sửa lỗi và tăng cường bảo mật</li>
                <li>• Tính năng mới và cải tiến UX</li>
                <li>• Tương thích tốt hơn với website</li>
              </ul>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {(isInProgress || isCompleted || hasError) && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-medium">{getStageText(progressState.stage)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {progressState.message}
              </div>
            </div>

            {isInProgress && (
              <div className="space-y-2">
                <Progress value={progressState.progress} className="w-full" />
                <div className="text-center text-sm text-gray-500">
                  {progressState.progress}%
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <div className="text-green-800 dark:text-green-200">
                  Browser đã được cập nhật thành công!
                </div>
              </div>
            )}

            {hasError && (
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <div className="text-red-800 dark:text-red-200">
                  {progressState.error || 'Có lỗi xảy ra trong quá trình cập nhật'}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!isInProgress && !isCompleted && !hasError && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Để sau
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                <Download className="h-4 w-4 mr-2" />
                Cập nhật ngay
              </Button>
            </>
          )}

          {isInProgress && (
            <Button variant="outline" disabled>
              Đang cập nhật...
            </Button>
          )}

          {(isCompleted || hasError) && (
            <Button onClick={handleClose}>
              {isCompleted ? 'Hoàn thành' : 'Đóng'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 