import { Monitor, Play, Square, WifiOff } from "lucide-react";
import { createElement } from "react";
import type { Profile } from "@/hooks/use-cached-data";

// Browser Status Interface
export interface BrowserStatus {
  profileId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
  wsUrl?: string;
  port?: number;
  processId?: number;
  startTime?: Date;
  lastActivity?: Date;
  errorCount: number;
}

export type SortableColumn = "Name" | "Group" | "LastRunAt" | "CreatedAt";
export type BulkActionType = 'export' | 'group' | 'extension' | 'proxy' | 'delete' | 'bookmark' | 'useragent';

export interface ProfileActionsProps {
  profile: Profile;
  browserStatus?: BrowserStatus;
  launchingProfileId: string | null;
  stoppingProfileId: string | null;
  deletingProfileId: string | null;
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

// Navigator configuration for profile creation
export interface NavigatorConfig {
  userAgent?: string;
  resolution?: string;
  language?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
}

// Data passed from profile create/edit form
export interface ProfileFormData {
  Name: string;
  GroupId: number | null;
  os?: string;
  osSpec?: string;
  navigator?: NavigatorConfig;
  JsonData?: string;
}

// Parsed profile data cached from JsonData
export interface ParsedProfileData {
  os?: string;
  proxyEnabled?: boolean;
  proxy?: {
    mode: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  notes?: string;
  navigator?: Record<string, unknown>;
  extensions?: unknown[];
  bookmarks?: unknown[];
  [key: string]: unknown;
}

// Utility functions

export function formatShortTime(dateString: string | null): string {
  if (!dateString) return 'Chưa chạy';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} tháng trước`;

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} năm trước`;
}

export function parseJsonData(jsonStr: string | undefined | null): ParsedProfileData {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}

export function getStatusBadge(status: BrowserStatus | undefined) {
  if (!status || status.status === 'stopped') {
    return { variant: 'secondary' as const, text: 'Đã dừng', icon: createElement(Square, { className: "w-3 h-3" }) };
  }

  switch (status.status) {
    case 'starting':
      return { variant: 'default' as const, text: 'Đang khởi động...', icon: createElement(Play, { className: "w-3 h-3 animate-pulse" }) };
    case 'running':
      return { variant: 'default' as const, text: 'Đang chạy', icon: createElement(Monitor, { className: "w-3 h-3 text-green-500" }) };
    case 'stopping':
      return { variant: 'destructive' as const, text: 'Đang dừng...', icon: createElement(Square, { className: "w-3 h-3 animate-pulse" }) };
    case 'crashed':
      return { variant: 'destructive' as const, text: 'Lỗi', icon: createElement(WifiOff, { className: "w-3 h-3" }) };
    default:
      return { variant: 'secondary' as const, text: 'Không xác định', icon: createElement(Square, { className: "w-3 h-3" }) };
  }
}

export function getProfileNotes(profile: Profile): string {
  return parseJsonData(profile.JsonData).notes || "";
}

export function getProfileOs(profile: Profile): string {
  return parseJsonData(profile.JsonData).os || "win";
}

export function getProfileProxy(profile: Profile): { enabled: boolean; mode?: string; host?: string; port?: number } {
  const data = parseJsonData(profile.JsonData);
  if (data.proxyEnabled && data.proxy) {
    return { enabled: true, mode: data.proxy.mode, host: data.proxy.host, port: data.proxy.port };
  }
  return { enabled: false };
}

export interface Proxy {
  id: string | number;
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  name?: string;
}

export function getCurrentProxyId(profile: Profile | null, proxies: Proxy[]): string {
  if (!profile?.JsonData) return "none";
  const data = parseJsonData(profile.JsonData);
  if (data.proxyEnabled && data.proxy) {
    const match = proxies.find(p => p.host === data.proxy!.host && p.port === data.proxy!.port);
    return match ? String(match.id) : "none";
  }
  return "none";
}
