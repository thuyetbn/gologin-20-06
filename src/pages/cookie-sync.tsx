import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CookieSyncPanel } from '@/components/cookie-sync/cookie-sync-panel';
import { 
  Cookie, 
  Settings, 
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface Profile {
  Id: string;
  Name: string;
  Status?: string;
}

const CookieSyncPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profiles on component mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profiles = await window.api.invoke('profiles:get');
      const data: Profile[] = Array.isArray(profiles) ? profiles : [];
      setProfiles(data);

      // Auto-select first profile if available
      if (data.length > 0) {
        setSelectedProfile(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setError(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cookie className="h-8 w-8" />
            Cookie Synchronization
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage cookies between local profiles and GoLogin server
          </p>
        </div>
        
        <Button
          onClick={loadProfiles}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Profiles
        </Button>
      </div>

      <Separator />

      {/* Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Profile Selection
            </CardTitle>
            <CardDescription>
              Choose a profile to sync cookies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading profiles...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No profiles found</p>
                <Button 
                  onClick={loadProfiles} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.Id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProfile?.Id === profile.Id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleProfileSelect(profile)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{profile.Name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {profile.Id}
                        </div>
                      </div>
                      {profile.Status && (
                        <Badge
                          variant={profile.Status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {profile.Status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              API settings for cookie sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-token">Access Token</Label>
              <Input
                id="access-token"
                type="password"
                placeholder="Enter your GoLogin API token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for server authentication
              </p>
            </div>

            {selectedProfile && (
              <div className="space-y-2">
                <Label>Selected Profile</Label>
                <div className="p-2 bg-muted rounded border">
                  <div className="font-medium">{selectedProfile.Name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedProfile.Id}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Status
            </CardTitle>
            <CardDescription>
              Current sync status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Selected</span>
                {selectedProfile ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Access Token</span>
                {accessToken ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Ready to Sync</span>
                {selectedProfile && accessToken ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </div>

            {(!selectedProfile || !accessToken) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {!selectedProfile && !accessToken 
                    ? 'Select a profile and enter access token to continue'
                    : !selectedProfile 
                    ? 'Please select a profile'
                    : 'Please enter your access token'
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Cookie Sync Panel */}
      {selectedProfile && accessToken && (
        <div className="flex justify-center">
          <CookieSyncPanel
            profileId={selectedProfile.Id}
            accessToken={accessToken}
          />
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Cookie Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <h4 className="font-medium">Setup</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Select a profile and enter your GoLogin API access token
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <h4 className="font-medium">Sync</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload local cookies to server or download server cookies to local
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <h4 className="font-medium">Monitor</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Track sync status and view cookie information
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Important Notes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Cookies are encrypted during transmission and storage</li>
              <li>Local cookies are stored in Chrome-compatible SQLite format</li>
              <li>Full sync downloads from server then uploads local changes</li>
              <li>Backup is automatically created before downloading</li>
              <li>Only session and persistent cookies are synchronized</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieSyncPage;
