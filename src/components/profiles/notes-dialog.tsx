import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/hooks/use-cached-data";

interface NotesDialogProps {
  open: boolean;
  profile: Profile | null;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function NotesDialog({
  open,
  profile,
  value,
  onChange,
  onSave,
  onClose,
}: NotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Sửa ghi chú cho Profile: {profile?.Name || "Không xác định"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notesField">Ghi chú</Label>
            <Textarea
              id="notesField"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Nhập ghi chú cho profile..."
              rows={5}
              maxLength={200}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {value.length}/200 ký tự
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={onSave} disabled={!profile}>Lưu ghi chú</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
