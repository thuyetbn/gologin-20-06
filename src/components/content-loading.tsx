"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface ContentLoadingProps {
  type?: 'table' | 'cards' | 'page';
  rows?: number;
  message?: string;
}

const ContentLoading = ({ 
  type = 'page', 
  rows = 5, 
  message = "Loading content..." 
}: ContentLoadingProps) => {
  
  if (type === 'page') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">{message}</p>
          <p className="text-sm text-muted-foreground">Please wait while we load your data...</p>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-4">
        {/* Table Header Skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-full" />
        </div>
        
        {/* Table Rows Skeleton */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return null;
};

export default ContentLoading; 