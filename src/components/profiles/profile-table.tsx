import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Profile } from "@/hooks/use-cached-data";
import {
  ArrowUpDown,
  FileText,
  Monitor,
  Pencil,
  Play,
  PlayCircle,
  RotateCcw,
  Server,
  Square,
} from "lucide-react";
import { ProfileActionsMenu } from "./profile-actions-menu";
import {
  type BrowserStatus,
  type SortableColumn,
  formatShortTime,
  getProfileNotes,
  getProfileOs,
  getProfileProxy,
  getStatusBadge,
} from "./types";

interface ProfileTableProps {
  profiles: Profile[];
  groups: { Id: number | null; Name: string }[];
  browserStatuses: Record<string, BrowserStatus>;
  selectedProfiles: Set<string>;
  launchingProfileId: string | null;
  stoppingProfileId: string | null;
  deletingProfileId: string | null;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectProfile: (profileId: string, checked: boolean) => void;
  onRequestSort: (key: SortableColumn) => void;
  onEdit: (profile: Profile) => void;
  onEditNotes: (profile: Profile) => void;
  onLaunch: (profileId: string) => void;
  onStop: (profileId: string) => void;
  onRestart: (profileId: string) => void;
  onDelete: (profileId: string) => void;
  onImportCookie: (profileId: string) => void;
  onExportCookie: (profileId: string) => void;
  onUpdateUserAgent: (profileId: string) => void;
}

const columns = [
  { key: "select", label: "", sortable: false },
  { key: "name", label: "Tên profile", sortable: true, sortKey: "Name" as SortableColumn },
  { key: "groups", label: "Nhóm", sortable: true, sortKey: "Group" as SortableColumn },
  { key: "notes", label: "Ghi chú", sortable: false },
  { key: "storage", label: "Lưu trữ" },
  { key: "os", label: "OS" },
  { key: "status", label: "Trạng thái" },
  { key: "proxy", label: "Proxy" },
  { key: "lastRun", label: "Lần chạy cuối", sortable: true, sortKey: "LastRunAt" as SortableColumn },
  { key: "action", label: "" },
];

const osLabels: Record<string, string> = { win: 'Win', mac: 'Mac', lin: 'Lin', android: 'And' };

export function ProfileTable({
  profiles,
  groups,
  browserStatuses,
  selectedProfiles,
  launchingProfileId,
  stoppingProfileId,
  deletingProfileId,
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
  onSelectProfile,
  onRequestSort,
  onEdit,
  onEditNotes,
  onLaunch,
  onStop,
  onRestart,
  onDelete,
  onImportCookie,
  onExportCookie,
  onUpdateUserAgent,
}: ProfileTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>
              {col.key === 'select' ? (
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  ref={isPartiallySelected ? (ref) => {
                    if (ref) (ref as any).indeterminate = true;
                  } : undefined}
                />
              ) : col.sortable ? (
                <Button variant="ghost" onClick={() => onRequestSort(col.sortKey!)}>
                  {col.label} <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                col.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => {
          const isSelected = selectedProfiles.has(profile.Id);
          const status = browserStatuses[profile.Id];
          const badge = getStatusBadge(status);
          const isRunning = status?.status === 'running';
          const isStarting = status?.status === 'starting';
          const isStopping = status?.status === 'stopping';
          const proxyInfo = getProfileProxy(profile);
          const os = getProfileOs(profile);

          return (
            <TableRow key={profile.Id} className={isSelected ? 'bg-blue-50 dark:bg-blue-950' : ''}>
              <TableCell>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelectProfile(profile.Id, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[200px]">{profile.Name}</span>
                  <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => onEdit(profile)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {profile.GroupId
                    ? groups.find(g => g.Id === profile.GroupId)?.Name ?? 'Không xác định'
                    : 'Không có nhóm'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="max-w-[100px] truncate text-sm italic text-gray-600 dark:text-gray-400">
                    {getProfileNotes(profile) || '-'}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6"
                    onClick={() => onEditNotes(profile)}
                    title="Sửa ghi chú"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {profile.ProfilePath ? <Server className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{osLabels[os] || 'Win'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={badge.variant} className="flex items-center gap-1 w-fit">
                  {badge.icon}
                  {badge.text}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="max-w-[150px] truncate">
                  {proxyInfo.enabled
                    ? `${proxyInfo.mode?.toUpperCase()}|${proxyInfo.host}:${proxyInfo.port}`
                    : <span>IP gốc</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {formatShortTime(profile.LastRunAt ?? "")}
                  </span>
                  {profile.LastRunAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(profile.LastRunAt).toLocaleString('vi-VN', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center gap-1">
                  {isRunning ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStop(profile.Id)}
                        disabled={isStopping}
                        title="Dừng browser"
                      >
                        <Square className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRestart(profile.Id)}
                        title="Khởi động lại browser"
                      >
                        <RotateCcw className="h-4 w-4 text-blue-500" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onLaunch(profile.Id)}
                      disabled={isStarting || launchingProfileId === profile.Id}
                      title="Khởi động browser"
                    >
                      {isStarting || launchingProfileId === profile.Id ? (
                        <Play className="h-4 w-4 animate-pulse text-blue-500" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                  )}
                  <ProfileActionsMenu
                    profile={profile}
                    browserStatus={status}
                    deletingProfileId={deletingProfileId}
                    onEdit={onEdit}
                    onEditNotes={onEditNotes}
                    onImportCookie={onImportCookie}
                    onExportCookie={onExportCookie}
                    onUpdateUserAgent={onUpdateUserAgent}
                    onDelete={onDelete}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
