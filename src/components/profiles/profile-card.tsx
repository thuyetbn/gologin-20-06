import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile } from "@/hooks/use-cached-data";
import { Monitor, PlayCircle, RotateCcw, Server, Square } from "lucide-react";
import { ProfileActionsMenu } from "./profile-actions-menu";
import {
  type BrowserStatus,
  type ProfileActionsProps,
  formatShortTime,
  getProfileNotes,
  getProfileProxy,
  getStatusBadge,
} from "./types";

interface ProfileCardProps extends Omit<ProfileActionsProps, 'profile'> {
  profile: Profile;
  groups: { Id: number | null; Name: string }[];
  isSelected: boolean;
  onSelect: (profileId: string, checked: boolean) => void;
}

export function ProfileCard({
  profile,
  groups,
  browserStatus,
  isSelected,
  launchingProfileId,
  stoppingProfileId,
  deletingProfileId,
  onSelect,
  onEdit,
  onEditNotes,
  onLaunch,
  onStop,
  onRestart,
  onDelete,
  onImportCookie,
  onExportCookie,
  onUpdateUserAgent,
}: ProfileCardProps) {
  const proxyInfo = getProfileProxy(profile);
  const notes = getProfileNotes(profile);
  const status = browserStatus;
  const badge = getStatusBadge(status);
  const isRunning = status?.status === 'running';
  const isStopping = status?.status === 'stopping';
  const isStarting = status?.status === 'starting';

  return (
    <Card className={`w-full ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(profile.Id, checked as boolean)}
            />
            <CardTitle className="text-lg truncate">{profile.Name}</CardTitle>
          </div>
          <ProfileActionsMenu
            profile={profile}
            browserStatus={browserStatus}
            deletingProfileId={deletingProfileId}
            onEdit={onEdit}
            onEditNotes={onEditNotes}
            onImportCookie={onImportCookie}
            onExportCookie={onExportCookie}
            onUpdateUserAgent={onUpdateUserAgent}
            onDelete={onDelete}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">
            {profile.GroupId
              ? groups.find(g => g.Id === profile.GroupId)?.Name ?? 'Không xác định'
              : 'Không có nhóm'}
          </Badge>
          <Badge variant={badge.variant} className="flex items-center gap-1">
            {badge.icon}
            {badge.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Lưu trữ:</span>
            {profile.ProfilePath ? <Server className="w-4 h-4 inline ml-2" /> : <Monitor className="w-4 h-4 inline ml-2" />}
          </div>
        </div>

        <div>
          <span className="text-muted-foreground text-sm">Proxy:</span>
          <div className="mt-1">
            {proxyInfo.enabled ? (
              <Badge variant="secondary" className="text-xs">
                {proxyInfo.mode?.toUpperCase()}|{proxyInfo.host}:{proxyInfo.port}
              </Badge>
            ) : (
              <Badge variant="outline">IP gốc</Badge>
            )}
          </div>
        </div>

        {notes && (
          <div>
            <span className="text-muted-foreground text-sm">Ghi chú:</span>
            <p className="text-sm mt-1 italic text-gray-600 dark:text-gray-400">{notes}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div>Ngày tạo: {profile.CreatedAt ? new Date(profile.CreatedAt).toLocaleDateString() : "N/A"}</div>
          <div>Lần chạy cuối: {formatShortTime(profile.LastRunAt ?? "")}</div>
        </div>
      </CardContent>
      <CardFooter>
        {isRunning ? (
          <div className="flex gap-2 w-full">
            <Button
              className="flex-1"
              variant="destructive"
              onClick={() => onStop(profile.Id)}
              disabled={isStopping}
            >
              <Square className="mr-2 h-4 w-4" />
              Dừng
            </Button>
            <Button
              variant="outline"
              onClick={() => onRestart(profile.Id)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={() => onLaunch(profile.Id)}
            disabled={isStarting || launchingProfileId === profile.Id}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Khởi động Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
