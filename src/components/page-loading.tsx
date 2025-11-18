"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const PageLoading = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    const handleRouteChangeStart = () => {
      setIsLoading(true);
      setProgress(0);
      
      // Simulate loading progress
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 100);
    };

    const handleRouteChangeComplete = () => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };

    const handleRouteChangeError = () => {
      setIsLoading(false);
      setProgress(0);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [router]);

  if (!isLoading) return null;

  return (
    <>
      {/* Top Loading Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <div 
          className="h-1 bg-primary transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Full Page Loading Overlay */}
      <div className={cn(
        "fixed inset-0 bg-background/80 backdrop-blur-sm z-[99] flex items-center justify-center",
        "transition-opacity duration-200",
        isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
          </div>
          <div className="text-sm text-muted-foreground">Loading page...</div>
        </div>
      </div>
    </>
  );
};

export default PageLoading; 