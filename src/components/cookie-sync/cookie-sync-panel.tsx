import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  RefreshCw, 
  Cookie, 
  Server, 
  HardDrive,
  CheckCircle,
  XCircle,
  Clock,
  Info
} from 'lucide-react';

interface CookieInfo {
  exists: boolean;
  count: number;
  path: string;
  domains?: string[];
  lastModified?: string;
}

interface CookieSyncResult {
  success: boolean;
  message: string;
  cookieCount?: number;
  error?: string;
}

interface CookieSyncPanelProps {
  profileId: string;
  accessToken: string;
  profilePath?: string;
}

export const CookieSyncPanel: React.FC<CookieSyncPanelProps> = ({
  profileId,
  accessToken,
  profilePath
}) => {
  const [localCookieInfo, setLocalCookieInfo] = useState<CookieInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CookieSyncResult | null>(null);
  const [operation, setOperation] = useState<'upload' | 'download' | 'sync' | null>(null);

  // Load local cookie info on component mount
  useEffect(() => {
    loadLocalCookieInfo();
  }, [profileId]);

  const loadLocalCookieInfo = async () => {
    try {
      const result = await window.api.invoke('cookies:get-local-info', {
        profileId,
        accessToken,
        profilePath
      });

      if (result.success) {
        setLocalCookieInfo(result.data);
      } else {
        console.error('Failed to load local cookie info:', result.error);
      }
    } catch (error) {
      console.error('Error loading local cookie info:', error);
    }
  };

  const handleUploadCookies = async () => {
    setIsLoading(true);
    setOperation('upload');
    setLastResult(null);

    try {
      const result = await window.api.invoke('cookies:upload', {
        profileId,
        accessToken,
        profilePath
      });

      setLastResult(result.data || { 
        success: false, 
        message: result.error || 'Unknown error',
        error: result.error 
      });
      
      if (result.success) {
        await loadLocalCookieInfo(); // Refresh local info
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setOperation(null);
    }
  };

  const handleDownloadCookies = async () => {
    setIsLoading(true);
    setOperation('download');
    setLastResult(null);

    try {
      const result = await window.api.invoke('cookies:download', {
        profileId,
        accessToken,
        profilePath
      });

      setLastResult(result.data || { success: false, error: result.error });
      
      if (result.success) {
        await loadLocalCookieInfo(); // Refresh local info
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setOperation(null);
    }
  };

  const handleSyncCookies = async () => {
    setIsLoading(true);
    setOperation('sync');
    setLastResult(null);

    try {
      const result = await window.api.invoke('cookies:sync', {
        profileId,
        accessToken,
        profilePath
      });

      if (result.success) {
        setLastResult({
          success: true,
          message: `Sync completed: Downloaded ${result.data.download.cookieCount || 0} cookies, Uploaded ${result.data.upload.cookieCount || 0} cookies`
        });
      } else {
        setLastResult({ 
          success: false, 
          message: result.error || 'Unknown error',
          error: result.error 
        });
      }
      
      if (result.success) {
        await loadLocalCookieInfo(); // Refresh local info
      }
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setOperation(null);
    }
  };

  const formatLastModified = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cookie className="h-5 w-5" />
          Cookie Synchronization
        </CardTitle>
        <CardDescription>
          Manage cookies between local profile and server for profile: {profileId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Local Cookie Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <h3 className="font-medium">Local Cookies</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadLocalCookieInfo}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {localCookieInfo ? (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant={localCookieInfo.exists ? "default" : "secondary"}>
                  {localCookieInfo.exists ? "Found" : "Not Found"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Count</div>
                <div className="font-medium">{localCookieInfo.count} cookies</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Domains</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {localCookieInfo.domains?.slice(0, 5).map((domain, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {domain}
                    </Badge>
                  ))}
                  {(localCookieInfo.domains?.length || 0) > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{(localCookieInfo.domains?.length || 0) - 5} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Last Modified</div>
                <div className="text-sm">{formatLastModified(localCookieInfo.lastModified)}</div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground">
              Loading local cookie information...
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <h3 className="font-medium">Synchronization Actions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={handleUploadCookies}
              disabled={isLoading || !localCookieInfo?.exists}
              className="flex items-center gap-2"
              variant="outline"
            >
              {isLoading && operation === 'upload' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload to Server
            </Button>

            <Button
              onClick={handleDownloadCookies}
              disabled={isLoading}
              className="flex items-center gap-2"
              variant="outline"
            >
              {isLoading && operation === 'download' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download from Server
            </Button>

            <Button
              onClick={handleSyncCookies}
              disabled={isLoading}
              className="flex items-center gap-2"
              variant="default"
            >
              {isLoading && operation === 'sync' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Full Sync
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>• <strong>Upload:</strong> Send local cookies to server</div>
            <div>• <strong>Download:</strong> Get cookies from server to local</div>
            <div>• <strong>Full Sync:</strong> Download from server then upload local changes</div>
          </div>
        </div>

        {/* Result Display */}
        {lastResult && (
          <Alert className={lastResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={lastResult.success ? "text-green-800" : "text-red-800"}>
                {lastResult.success ? (
                  <div>
                    <div className="font-medium">{lastResult.message}</div>
                    {lastResult.cookieCount !== undefined && (
                      <div className="text-sm mt-1">
                        Processed {lastResult.cookieCount} cookies
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Operation Failed</div>
                    <div className="text-sm mt-1">{lastResult.error}</div>
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div><strong>Profile ID:</strong> {profileId}</div>
              {profilePath && <div><strong>Profile Path:</strong> {profilePath}</div>}
              <div className="text-xs text-muted-foreground mt-2">
                Cookies are synchronized with the GoLogin server using encrypted storage.
                Local cookies are stored in SQLite format compatible with Chrome.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
