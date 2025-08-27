import { useEffect, useRef, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CloseStartupPopupButton } from '@/components/startup/close-button';

interface StartupLog {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  progress?: number;
  ts: number;
}

export default function StartupLogs() {
  const [logs, setLogs] = useState<StartupLog[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (_e: any, payload: StartupLog) => {
      setLogs(prev => [...prev, payload]);
      if (typeof payload.progress === 'number') {
        setProgress(prev => Math.max(prev, payload.progress));
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    };

    (window as any).api?.on('startup:log' as any, handler as any);
    return () => {
      (window as any).api?.removeAllListeners('startup:log' as any);
    };
  }, []);

  const levelBadge = (level: StartupLog['level']) => {
    const variant = level === 'success' ? 'default' : level === 'warning' ? 'secondary' : level === 'error' ? 'destructive' : 'outline';
    return <Badge variant={variant as any}>{level.toUpperCase()}</Badge>;
  };

  return (
    <div className="min-h-screen p-4 bg-muted/40">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Khởi tạo ứng dụng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Progress value={progress} />
            </div>
            <div className="h-[320px] overflow-auto rounded border bg-background p-3 space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground tabular-nums">{new Date(log.ts).toLocaleTimeString()}</span>
                  {levelBadge(log.level)}
                  <span>{log.message}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </CardContent>
          <CardFooter>
            <CloseStartupPopupButton />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

