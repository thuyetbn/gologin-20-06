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
import { ArrowDownToLine, CheckCircle2, Download, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface UpdaterStatus {
  status: "idle" | "checking" | "available" | "up-to-date" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  error?: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export function AppUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>({ status: "idle" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).api) return;

    // Get current version
    (window as any).api.invoke("updater:get-version").then((v: string) => {
      setCurrentVersion(v);
    }).catch(() => {});

    // Listen for updater status events
    const handleStatus = (_event: any, data: UpdaterStatus) => {
      setStatus(data);

      if (data.status === "available") {
        setDialogOpen(true);
      }
    };

    (window as any).api.on("updater:status", handleStatus);

    // Auto-check on startup (delay 5s to let app settle)
    const timer = setTimeout(() => {
      (window as any).api.invoke("updater:check").catch(() => {});
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!(window as any).api) return;
    setStatus({ status: "checking" });
    try {
      const result = await (window as any).api.invoke("updater:check");
      if (result.success && !result.hasUpdate) {
        setStatus({ status: "up-to-date", version: result.version });
        setDialogOpen(true);
      }
    } catch {
      setStatus({ status: "error", error: "Không thể kiểm tra cập nhật" });
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!(window as any).api) return;
    try {
      await (window as any).api.invoke("updater:download");
    } catch {
      setStatus({ status: "error", error: "Tải xuống thất bại" });
    }
  }, []);

  const installUpdate = useCallback(() => {
    if (!(window as any).api) return;
    (window as any).api.invoke("updater:install");
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Trigger button in sidebar footer */}
      <button
        onClick={checkForUpdates}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        title="Kiểm tra cập nhật"
      >
        <span>v{currentVersion || "..."}</span>
        {status.status === "available" || status.status === "downloaded" ? (
          <Badge variant="destructive" className="h-4 px-1 text-[10px]">
            MỚI
          </Badge>
        ) : null}
      </button>

      {/* Update dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {status.status === "available" && (
                <>
                  <ArrowDownToLine className="h-5 w-5 text-blue-500" />
                  Có bản cập nhật mới
                </>
              )}
              {status.status === "checking" && (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Đang kiểm tra...
                </>
              )}
              {status.status === "downloading" && (
                <>
                  <Download className="h-5 w-5 text-blue-500" />
                  Đang tải xuống
                </>
              )}
              {status.status === "downloaded" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Sẵn sàng cài đặt
                </>
              )}
              {status.status === "up-to-date" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Đã là phiên bản mới nhất
                </>
              )}
              {status.status === "error" && (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Lỗi cập nhật
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {status.status === "available" && (
                <span>
                  Phiên bản <strong>v{status.version}</strong> đã sẵn sàng.
                  Phiên bản hiện tại: v{currentVersion}
                </span>
              )}
              {status.status === "up-to-date" && (
                <span>Bạn đang dùng phiên bản mới nhất (v{currentVersion}).</span>
              )}
              {status.status === "downloaded" && (
                <span>
                  Phiên bản <strong>v{status.version}</strong> đã tải xong.
                  Khởi động lại để cài đặt.
                </span>
              )}
              {status.status === "error" && (
                <span className="text-red-500">{status.error}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Download progress */}
          {status.status === "downloading" && (
            <div className="space-y-2 py-2">
              <Progress value={status.percent || 0} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{(status.percent || 0).toFixed(1)}%</span>
                <span>
                  {status.transferred && status.total
                    ? `${formatBytes(status.transferred)} / ${formatBytes(status.total)}`
                    : ""}
                  {status.bytesPerSecond
                    ? ` • ${formatBytes(status.bytesPerSecond)}/s`
                    : ""}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {status.status === "available" && (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Để sau
                </Button>
                <Button onClick={downloadUpdate}>
                  <Download className="h-4 w-4 mr-2" />
                  Tải xuống
                </Button>
              </>
            )}
            {status.status === "downloaded" && (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Để sau
                </Button>
                <Button onClick={installUpdate}>
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Khởi động lại & Cài đặt
                </Button>
              </>
            )}
            {(status.status === "up-to-date" || status.status === "error") && (
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Đóng
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
