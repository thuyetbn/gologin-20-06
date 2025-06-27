"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Download, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BrowserDownloadProgress {
  stage: 'checking' | 'downloading' | 'extracting' | 'installing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

const BrowserDownloadPage: React.FC = () => {
  const [downloadProgress, setDownloadProgress] = useState<BrowserDownloadProgress>({
    stage: 'checking',
    progress: 0,
    message: 'Initializing download...'
  });

  useEffect(() => {
    // Listen for download progress from main process
    if (typeof window !== 'undefined' && (window as any).api) {
      const handleProgress = (event: any, progress: BrowserDownloadProgress) => {
        setDownloadProgress(progress);
      };

      (window as any).api.on('browser-download-progress', handleProgress);

      return () => {
        // Cleanup listener (if API supports removeListener)
        if ((window as any).api.removeListener) {
          (window as any).api.removeListener('browser-download-progress', handleProgress);
        }
      };
    }
  }, []);

  const getStageIcon = () => {
    switch (downloadProgress.stage) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Download className="h-8 w-8 text-blue-500 animate-pulse" />;
    }
  };

  const getStageColor = () => {
    switch (downloadProgress.stage) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const closeWindow = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold mb-2">Browser Update</CardTitle>
              <p className="text-muted-foreground">Downloading and installing Orbita Browser</p>
            </div>
            {downloadProgress.stage === 'completed' || downloadProgress.stage === 'error' ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={closeWindow}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stage Icon and Status */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-lg">
              {getStageIcon()}
            </div>
            
            <div className="text-center">
              <h3 className={`text-lg font-semibold ${getStageColor()}`}>
                {downloadProgress.stage === 'checking' && 'Checking Requirements'}
                {downloadProgress.stage === 'downloading' && 'Downloading Browser'}
                {downloadProgress.stage === 'extracting' && 'Extracting Files'}
                {downloadProgress.stage === 'installing' && 'Installing Browser'}
                {downloadProgress.stage === 'completed' && 'Installation Complete'}
                {downloadProgress.stage === 'error' && 'Installation Failed'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {downloadProgress.message}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {downloadProgress.stage !== 'completed' && downloadProgress.stage !== 'error' && (
            <div className="space-y-2">
              <Progress 
                value={downloadProgress.progress} 
                className="w-full h-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(downloadProgress.progress)}%</span>
              </div>
            </div>
          )}

          {/* Error Details */}
          {downloadProgress.stage === 'error' && downloadProgress.error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
                Error Details:
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {downloadProgress.error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {downloadProgress.stage === 'completed' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2">
                🎉 Update Successful!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Browser has been updated to the latest version. You can now close this window.
              </p>
            </div>
          )}

          {/* Close Button for Final States */}
          {(downloadProgress.stage === 'completed' || downloadProgress.stage === 'error') && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={closeWindow}
                variant={downloadProgress.stage === 'completed' ? 'default' : 'destructive'}
                className="w-full"
              >
                {downloadProgress.stage === 'completed' ? 'Close' : 'Close'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserDownloadPage; 