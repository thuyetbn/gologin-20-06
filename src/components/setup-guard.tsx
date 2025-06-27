"use client";

import ContentLoading from '@/components/content-loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSetupCheck } from '@/hooks/use-setup-check';
import { AlertTriangle, Settings } from 'lucide-react';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';

interface SetupGuardProps {
  children: ReactNode;
  requireSetup?: boolean;
}

const SetupGuard = ({ children, requireSetup = true }: SetupGuardProps) => {
  const router = useRouter();
  const { isSetupRequired, isLoading, dataPath } = useSetupCheck();

  // Show loading while checking setup
  if (isLoading) {
    return <ContentLoading type="page" message="Checking setup..." />;
  }

  // If setup is required but not completed, show setup required page
  if (requireSetup && isSetupRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Settings className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <CardTitle className="text-xl">Setup Required</CardTitle>
            <CardDescription>
              You need to configure the data storage path before using the application.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Data Path Not Configured
                </p>
                <p className="text-orange-700 dark:text-orange-300 mt-1">
                  Please select a folder to store your profiles and database.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Required Setup:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  Configure data storage path
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  Verify folder permissions
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  Initialize database
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => router.push('/settings?setup=required')} 
              className="w-full"
              size="lg"
            >
              <Settings className="mr-2 h-4 w-4" />
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Setup completed or not required, render children
  return <>{children}</>;
};

export default SetupGuard; 