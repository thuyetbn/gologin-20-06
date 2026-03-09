import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Download,
  Globe,
  MoreHorizontal,
  Pencil,
  Upload,
} from "lucide-react";
import type { ProfileActionsProps } from "./types";

export function ProfileActionsMenu({
  profile,
  browserStatus,
  deletingProfileId,
  onEdit,
  onEditNotes,
  onImportCookie,
  onExportCookie,
  onUpdateUserAgent,
  onDelete,
}: Omit<ProfileActionsProps, 'launchingProfileId' | 'stoppingProfileId' | 'onLaunch' | 'onStop' | 'onRestart'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(profile)}>
          <Pencil className="mr-2 h-4 w-4" />
          Sửa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditNotes(profile)}>
          <Pencil className="mr-2 h-4 w-4" />
          Sửa ghi chú
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImportCookie(profile.Id)}>
          <Upload className="mr-2 h-4 w-4" />
          Nhập Cookie
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExportCookie(profile.Id)}>
          <Download className="mr-2 h-4 w-4" />
          Xuất Cookie
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onUpdateUserAgent(profile.Id)}>
          <Globe className="mr-2 h-4 w-4" />
          Cập nhật UserAgent
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(profile.Id)}
          className="text-red-500"
          disabled={deletingProfileId === profile.Id}
        >
          {deletingProfileId === profile.Id ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Đang xóa...
            </>
          ) : (
            "Xóa"
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
