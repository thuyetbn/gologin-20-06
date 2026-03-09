import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BulkActionType, Proxy } from "./types";

interface BulkActionDialogProps {
  open: boolean;
  action: BulkActionType | null;
  selectedCount: number;
  groups: { Id: number | null; Name: string }[];
  proxies: Proxy[];
  isProcessing: boolean;
  bulkGroupId: string;
  bulkBookmarkData: string;
  bulkExtensionData: string;
  bulkProxyId: string;
  bulkUserAgent: string;
  onGroupIdChange: (v: string) => void;
  onBookmarkDataChange: (v: string) => void;
  onExtensionDataChange: (v: string) => void;
  onProxyIdChange: (v: string) => void;
  onUserAgentChange: (v: string) => void;
  onExecute: () => void;
  onClose: () => void;
}

const actionTitles: Record<BulkActionType, string> = {
  export: 'Xuất Cookies',
  group: 'Gán nhóm',
  extension: 'Cập nhật Extensions',
  proxy: 'Gán Proxy',
  bookmark: 'Cập nhật Bookmarks',
  useragent: 'Cập nhật UserAgent',
  delete: 'Xoá Profiles',
};

export function BulkActionDialog({
  open,
  action,
  selectedCount,
  groups,
  proxies,
  isProcessing,
  bulkGroupId,
  bulkBookmarkData,
  bulkExtensionData,
  bulkProxyId,
  bulkUserAgent,
  onGroupIdChange,
  onBookmarkDataChange,
  onExtensionDataChange,
  onProxyIdChange,
  onUserAgentChange,
  onExecute,
  onClose,
}: BulkActionDialogProps) {
  if (!action) return null;

  const isDisabled = isProcessing || (
    (action === 'group' && !bulkGroupId) ||
    (action === 'extension' && !bulkExtensionData.trim()) ||
    (action === 'proxy' && !bulkProxyId) ||
    (action === 'bookmark' && !bulkBookmarkData.trim()) ||
    (action === 'useragent' && !bulkUserAgent.trim())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{actionTitles[action]} ({selectedCount} profiles)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {action === 'export' && (
            <div className="text-center">
              <p>Tất cả cookies sẽ được export thành một file JSON.</p>
              <p className="text-sm text-gray-500 mt-2">
                File sẽ có format: {`{profileId: [cookies], ...}`}
              </p>
            </div>
          )}

          {action === 'group' && (
            <div className="space-y-2">
              <Label>Chọn nhóm mới</Label>
              <Select value={bulkGroupId} onValueChange={onGroupIdChange}>
                <SelectTrigger><SelectValue placeholder="Chọn nhóm" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không có nhóm</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.Id} value={String(g.Id)}>{g.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'extension' && (
            <div className="space-y-2">
              <Label>Dữ liệu Extensions (định dạng JSON)</Label>
              <textarea
                value={bulkExtensionData}
                onChange={(e) => onExtensionDataChange(e.target.value)}
                placeholder={`[\n  {"id": "extension-id", "enabled": true}\n]`}
                className="min-h-[120px] w-full p-3 border rounded-md font-mono text-sm"
              />
            </div>
          )}

          {action === 'proxy' && (
            <div className="space-y-2">
              <Label>Chọn proxy</Label>
              <Select value={bulkProxyId} onValueChange={onProxyIdChange}>
                <SelectTrigger><SelectValue placeholder="Chọn proxy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không proxy (Local IP)</SelectItem>
                  {proxies.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.type.toUpperCase()} - {p.host}:{p.port}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'bookmark' && (
            <div className="space-y-2">
              <Label>Dữ liệu Bookmarks (định dạng JSON)</Label>
              <textarea
                value={bulkBookmarkData}
                onChange={(e) => onBookmarkDataChange(e.target.value)}
                placeholder={`[\n  {"name": "Google", "url": "https://google.com"}\n]`}
                className="min-h-[120px] w-full p-3 border rounded-md font-mono text-sm"
              />
            </div>
          )}

          {action === 'useragent' && (
            <div className="space-y-2">
              <Label>UserAgent mới</Label>
              <textarea
                value={bulkUserAgent}
                onChange={(e) => onUserAgentChange(e.target.value)}
                placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
                className="min-h-[80px] w-full p-3 border rounded-md font-mono text-xs"
              />
              <p className="text-xs text-gray-500">
                Tất cả profiles đã chọn sẽ được cập nhật cùng UserAgent này.
              </p>
            </div>
          )}

          {action === 'delete' && (
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 font-semibold mb-2">
                Cảnh báo: Hành động không thể hoàn tác!
              </p>
              <p className="text-red-600 dark:text-red-400">
                Bạn sắp xoá {selectedCount} profile(s). Tất cả dữ liệu sẽ bị mất vĩnh viễn.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Hủy</Button>
          <Button
            onClick={onExecute}
            disabled={isDisabled}
            variant={action === 'delete' ? 'destructive' : 'default'}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang xử lý...
              </>
            ) : (
              `Thực hiện (${selectedCount} profiles)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
