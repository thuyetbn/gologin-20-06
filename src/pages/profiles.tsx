"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomPagination } from "@/components/ui/custom-pagination";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Profile, useCachedData } from "@/hooks/use-cached-data";

import { ArrowUpDown, Calendar, Download, FileText, Monitor, MoreHorizontal, Pencil, Play, PlayCircle, Plus, RotateCcw, Server, Square, Upload, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

// Browser Status Interface
interface BrowserStatus {
  profileId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
  wsUrl?: string;
  port?: number;
  processId?: number;
  startTime?: Date;
  lastActivity?: Date;
  errorCount: number;
}

// Import Group interface for local use
function formatShortTime(dateString: string | null): string {
  if (!dateString) return 'Chưa chạy';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Vừa xong';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ngày trước`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} năm trước`;
}
type SortableColumn = "Name" | "Group" | "LastRunAt" | "CreatedAt";

const ProfilesPage = () => {
  // Use optimized cached data hook instead of individual API calls
  const {
    profiles,
    groups, 
    proxies,
    isLoading,
    refreshCache,
    updateLocalProfile,
    addLocalProfile,
    removeLocalProfile
  } = useCachedData();

  // Dialog and UI state
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [createAtOrder, setCreateAtOrder] = useState<"newest" | "oldest" | "default">("default");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: SortableColumn;
    direction: "ascending" | "descending";
  } | null>({ key: "CreatedAt", direction: "descending" });

  const [browserStatuses, setBrowserStatuses] = useState<{ [key: string]: BrowserStatus }>({});
  const [launchingProfileId, setLaunchingProfileId] = useState<string | null>(null);
  const [stoppingProfileId, setStoppingProfileId] = useState<string | null>(null);

  // Form loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'export' | 'group' | 'extension' | 'proxy' | 'delete' | 'bookmark' | null>(null);
  const [bulkGroupId, setBulkGroupId] = useState<string>('');
  const [bulkBookmarkData, setBulkBookmarkData] = useState('');
  const [bulkExtensionData, setBulkExtensionData] = useState('');
  const [bulkProxyId, setBulkProxyId] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Notes dialog states
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNotesProfile, setCurrentNotesProfile] = useState<Profile | null>(null);
  const [notesValue, setNotesValue] = useState("");

  // Replace fetchAllData with refreshCache for better performance
  const fetchAllData = async () => {
    console.log('🔄 [Profiles] Refreshing cached data...');
    await refreshCache();
  };

  // Remove initial data loading useEffect - handled by useCachedData hook

  // Browser status monitoring effect
  useEffect(() => {
    // Load initial browser statuses
    const loadBrowserStatuses = async () => {
      try {
        const statuses = await window.api.invoke('profiles:getAllBrowserStatuses') as BrowserStatus[];
        const statusMap: { [key: string]: BrowserStatus } = {};
        statuses.forEach(status => {
          statusMap[status.profileId] = status;
        });
        setBrowserStatuses(statusMap);
      } catch (error) {
        console.error('Failed to load browser statuses:', error);
      }
    };

    loadBrowserStatuses();

    // Listen for real-time status updates
    const handleStatusUpdate = (_event: any, data: { profileId: string; status: BrowserStatus }) => {
      setBrowserStatuses(prev => ({
        ...prev,
        [data.profileId]: data.status
      }));
    };

    // Register listener
    window.api.on('browser-status-changed', handleStatusUpdate);

    // Cleanup
    return () => {
      window.api.removeAllListeners('browser-status-changed');
    };
  }, []);

  // Get status badge variant and text
  const getStatusBadge = (status: BrowserStatus | undefined) => {
    if (!status || status.status === 'stopped') {
      return { variant: 'secondary' as const, text: 'Đã dừng', icon: <Square className="w-3 h-3" /> };
    }
    
    switch (status.status) {
      case 'starting':
        return { variant: 'default' as const, text: 'Đang khởi động...', icon: <Play className="w-3 h-3 animate-pulse" /> };
      case 'running':
        return { variant: 'default' as const, text: 'Đang chạy', icon: <Monitor className="w-3 h-3 text-green-500" /> };
      case 'stopping':
        return { variant: 'destructive' as const, text: 'Đang dừng...', icon: <Square className="w-3 h-3 animate-pulse" /> };
      case 'crashed':
        return { variant: 'destructive' as const, text: 'Lỗi', icon: <WifiOff className="w-3 h-3" /> };
      default:
        return { variant: 'secondary' as const, text: 'Không xác định', icon: <Square className="w-3 h-3" /> };
    }
  };

  // Memoized filtered and sorted profiles (in useState)
  const processedProfiles = useMemo(() => {
    let sortableItems = [...profiles];

    // Filtering by search query (trong useState)
    if (debouncedSearchQuery) {
      sortableItems = sortableItems.filter((profile) =>
        profile.Name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Filtering by group
    if (groupFilter !== "all") {
      sortableItems = sortableItems.filter((profile) => 
        String(profile.GroupId) === groupFilter
      );
    }

    // Sorting by CreateAt order first (nếu được chọn)
    if (createAtOrder !== "default") {
      sortableItems.sort((a, b) => {
        const aDate = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
        const bDate = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
        
        if (createAtOrder === "newest") {
          return bDate - aDate; // Newest first (descending)
        } else {
          return aDate - bDate; // Oldest first (ascending)
        }
      });
    }
    // Sorting by column (nếu không có createAt order)
    else if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "Group") {
            aValue = a.Group?.Name || "";
            bValue = b.Group?.Name || "";
        } else if (sortConfig.key === "LastRunAt" || sortConfig.key === "CreatedAt") {
            aValue = a[sortConfig.key] ? new Date(a[sortConfig.key]!).getTime() : 0;
            bValue = b[sortConfig.key] ? new Date(b[sortConfig.key]!).getTime() : 0;
        } else {
            aValue = a[sortConfig.key] || "";
            bValue = b[sortConfig.key] || "";
        }

        if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return sortableItems;
  }, [profiles, debouncedSearchQuery, groupFilter, createAtOrder, sortConfig]);

  // Pagination calculations
  const totalItems = processedProfiles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageProfiles = processedProfiles.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, groupFilter, createAtOrder]);
  
  const requestSort = (key: SortableColumn) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get("name") as string,
      group: formData.get("group") as string,
      proxy: formData.get("proxy") as string,
    };

    // Clear errors and process data
    setFormErrors({});
    const groupIdValue = rawData.group;
    const proxyIdValue = rawData.proxy;
    
    // Prepare basic profile data
    const profileData = {
      Name: rawData.name.trim(),
      GroupId: groupIdValue === "none" ? null : Number(groupIdValue),
    };

    // Handle proxy data in JsonData
    let jsonData: any = {};
    if (currentProfile?.JsonData) {
      try {
        jsonData = JSON.parse(currentProfile.JsonData);
      } catch (error) {
        console.error("Failed to parse existing JsonData:", error);
      }
    }

    // Update proxy configuration
    if (proxyIdValue === "none") {
      jsonData.proxyEnabled = false;
      jsonData.proxy = {
        mode:  'none',
        host: '',
        port: 80,
        username: '',
        password: '',
      };
    } else {
      const selectedProxy = proxies.find(p => String(p.id) === proxyIdValue);
      if (selectedProxy) {
        jsonData.proxyEnabled = true;
        jsonData.proxy = {
          mode: selectedProxy?.type || 'none',
          host: selectedProxy?.host,
          port: selectedProxy?.port || 80,
          username: selectedProxy?.username || '',
          password: selectedProxy?.password || ''
        };
      }
    }
    const finalProfileData = {
      ...profileData,
      JsonData: JSON.stringify(jsonData)
    };
    console.log('JsonData', jsonData);
    setIsSaving(true);
    try {
      if (currentProfile) {
        const updateResult = await window.api.invoke("profiles:update", { ...currentProfile, ...finalProfileData });
        if (updateResult === true) {
          // Update local cache for instant UI feedback
          updateLocalProfile({ ...currentProfile, ...finalProfileData });
          toast.success("Profile đã được cập nhật thành công!");
          closeDialog();
        } else {
          toast.error("Lỗi khi cập nhật profile trên server");
        }
      } else {
        const profileId = await window.api.invoke("profiles:create", finalProfileData);
        if (profileId) {
          // Add to local cache for instant UI feedback
          const newProfile = { ...finalProfileData, Id: profileId, CreatedAt: new Date().toISOString() };
          addLocalProfile(newProfile);
          toast.success("Profile đã được tạo thành công!");
          closeDialog();
        } else {
          toast.error("Lỗi khi tạo profile trên server");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lưu profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    setDeletingProfileId(profileId);
    try {
      await window.api.invoke("profiles:delete", profileId);
      // Remove from local cache for instant UI feedback
      removeLocalProfile(profileId);
      toast.success("Profile deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete profile");
      // Refresh cache if delete failed
      await refreshCache();
    } finally {
      setDeletingProfileId(null);
    }
  };
  
  // Load running profiles helper - now optimized
  const loadRunningProfiles = async () => {
    // Just refresh cache instead of full data reload
    await refreshCache();
  };

  const handleLaunch = async (profileId: string) => {
    setLaunchingProfileId(profileId);
    try {
      await window.api.invoke('profiles:launch', profileId);
      toast.success("Profile đã được khởi động thành công!");
      await loadRunningProfiles();
    } catch (error: any) {
      toast.error(error.message || "Không thể khởi động profile");
    } finally {
      setLaunchingProfileId(null);
    }
  };

  const handleStopProfile = async (profileId: string) => {
    setStoppingProfileId(profileId);
    try {
      await window.api.invoke('profiles:stop', profileId);
      toast.success("Profile đã được dừng thành công!");
      await loadRunningProfiles();
    } catch (error: any) {
      toast.error(error.message || "Không thể dừng profile");
    } finally {
      setStoppingProfileId(null);
    }
  };

  const handleRestartProfile = async (profileId: string) => {
    try {
      await window.api.invoke('profiles:restartBrowser', profileId);
      toast.success("Profile đã được khởi động lại thành công!");
      await loadRunningProfiles();
    } catch (error: any) {
      toast.error(error.message || "Không thể khởi động lại profile");
    }
  };

  const handleExportCookie = async (profileId: string) => {
    try {
      // Get profile name for better file naming
      const profile = profiles.find(p => p.Id === profileId);
      const profileName = profile?.Name || profileId;

      // Call new export handler with file dialog
      const result = await window.api.invoke("profiles:exportCookieToFile", { profileId, profileName });

      if (result.success) {
        toast.success(`✅ Đã xuất ${result.cookieCount} cookies vào file: ${result.filePath}`);
      } else {
        if (result.cancelled) {
          toast.info("Đã hủy xuất cookies");
        } else {
          toast.error(`Lỗi khi xuất cookies: ${result.error}`);
        }
      }
    } catch (error: any) {
      toast.error(`Lỗi khi xuất cookies: ${error.message}`);
    }
  };

  const handleImportCookie = async (profileId: string) => {
    try {
      // Show confirmation dialog for replace mode
      const replace = window.confirm(
        "Bạn muốn thay thế toàn bộ cookies hiện tại?\n\n" +
        "- Chọn OK: Xóa tất cả cookies cũ và thay thế bằng cookies mới\n" +
        "- Chọn Cancel: Giữ cookies cũ và thêm cookies mới (merge)"
      );

      // Call new import handler with file dialog
      const result = await window.api.invoke("profiles:importCookieFromFile", { profileId, replace });

      if (result.success) {
        toast.success(`✅ Đã nhập ${result.cookieCount} cookies từ file: ${result.filePath}`);
      } else {
        if (result.cancelled) {
          toast.info("Đã hủy nhập cookies");
        } else {
          toast.error(`Lỗi khi nhập cookies: ${result.error}`);
        }
      }
    } catch (error: any) {
      toast.error(`Lỗi khi nhập cookies: ${error.message}`);
    }
  };

  const openDialog = (profile: Profile | null = null) => {
    setCurrentProfile(profile);
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCurrentProfile(null);
    setFormErrors({});
  };

  // Get current proxy from profile JsonData
  const getCurrentProxy = (profile: Profile | null) => {
    if (!profile?.JsonData) return "none";
    try {
      const jsonData = JSON.parse(profile.JsonData);
      if (jsonData.proxyEnabled && jsonData.proxy) {
        // Find matching proxy by host and port
        const matchingProxy = proxies.find(p => 
          p.host === jsonData.proxy.host && p.port === jsonData.proxy.port
        );
        return matchingProxy ? String(matchingProxy.id) : "none";
      }
    } catch (error) {
      console.error("Failed to parse profile JsonData:", error);
    }
    return "none";
  };

  // Get notes from profile JsonData
  const getProfileNotes = (profile: Profile | null): string => {
    if (!profile?.JsonData) return "";
    try {
      const jsonData = JSON.parse(profile.JsonData);
      return jsonData.notes || "";
    } catch (error) {
      console.error("Failed to parse profile JsonData for notes:", error);
      return "";
    }
  };

  const clearCreateAtOrder = () => {
    setCreateAtOrder("default");
  };

  // Notes dialog functions
  const openNotesDialog = (profile: Profile) => {
    setCurrentNotesProfile(profile);
    setNotesValue(getProfileNotes(profile));
    setNotesDialogOpen(true);
  };

  const closeNotesDialog = () => {
    setNotesDialogOpen(false);
    setCurrentNotesProfile(null);
    setNotesValue("");
  };

  const handleSaveNotes = async () => {
    if (!currentNotesProfile) return;

    try {
      // Parse existing JsonData
      let jsonData: any = {};
      if (currentNotesProfile.JsonData) {
        try {
          jsonData = JSON.parse(currentNotesProfile.JsonData);
        } catch (error) {
          console.error("Failed to parse existing JsonData:", error);
        }
      }

      // Update notes
      jsonData.notes = (notesValue || '').trim();

      // Update profile
      const updatedProfile = {
        ...currentNotesProfile,
        JsonData: JSON.stringify(jsonData)
      };
      
      const updateResult = await window.api.invoke("profiles:update", updatedProfile);
      
      if (updateResult === true) {
        // Update local cache for instant UI feedback
        updateLocalProfile(updatedProfile);
        toast.success("Ghi chú đã được cập nhật thành công!");
        closeNotesDialog();
      } else {
        toast.error("Lỗi khi cập nhật ghi chú trên server");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lưu ghi chú");
    }
  };

  const columns = [
    { key: "select", label: "", sortable: false },
    { key: "name", label: "Tên profile", sortable: true, sortKey: "Name" as SortableColumn },
    { key: "groups", label: "Nhóm", sortable: true, sortKey: "Group" as SortableColumn },
    { key: "notes", label: "Ghi chú", sortable: false },
    { key: "storage", label: "Storage" },
    { key: "os", label: "OS" },
    { key: "status", label: "Trạng thái" },
    { key: "proxy", label: "Proxy" },
    { key: "lastRun", label: "Lần chạy cuối", sortable: true, sortKey: "LastRunAt" as SortableColumn },
    { key: "action", label: "" },
  ];

  // Mobile Card Component
  const ProfileCard = ({ profile }: { profile: Profile }) => {
    const isSelected = selectedProfiles.has(profile.Id);
    
    return (
      <Card className={`w-full ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleSelectProfile(profile.Id, checked as boolean)}
              />
              <CardTitle className="text-lg truncate">{profile.Name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openDialog(profile)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openNotesDialog(profile)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Sửa ghi chú
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImportCookie(profile.Id)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Cookie
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCookie(profile.Id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Cookie
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(profile.Id)}
                  className="text-red-500"
                  disabled={deletingProfileId === profile.Id}
                >
                  {deletingProfileId === profile.Id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profile.GroupId ? (
              <Badge variant="outline">
                {groups.find(g => g.Id === profile.GroupId)?.Name ?? 'Không xác định'}
              </Badge>
            ) : (
              <Badge variant="outline">Không có nhóm</Badge>
            )}
            {(() => {
              const status = browserStatuses[profile.Id];
              const badge = getStatusBadge(status);
              return (
                <Badge variant={badge.variant} className="flex items-center gap-1">
                  {badge.icon}
                  {badge.text}
                </Badge>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">OS:</span>
              <Badge variant="outline" className="ml-2">Win</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Storage:</span>
              {profile.ProfilePath ? <Server className="w-4 h-4 inline ml-2" /> : <Monitor className="w-4 h-4 inline ml-2" />}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground text-sm">Proxy:</span>
            <div className="mt-1">
              {profile.JsonData ? (
                (() => {
                  try {
                    const jsonData = JSON.parse(profile.JsonData);
                    return jsonData.proxyEnabled ? 
                      <Badge variant="secondary" className="text-xs">{jsonData.proxy.mode.toUpperCase()}|{jsonData.proxy.host}:{jsonData.proxy.port}</Badge> : 
                      <Badge variant="outline">Local IP</Badge>;
                  } catch {
                    return <Badge variant="outline">Local IP</Badge>;
                  }
                })()
              ) : (
                <Badge variant="outline">Local IP</Badge>
              )}
            </div>
          </div>

          {getProfileNotes(profile) && (
            <div>
              <span className="text-muted-foreground text-sm">Ghi chú:</span>
              <p className="text-sm mt-1 italic text-gray-600 dark:text-gray-400">
                {getProfileNotes(profile)}
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <div>Created: {profile.CreatedAt ? new Date(profile.CreatedAt).toLocaleDateString() : "N/A"}</div>
            <div>Last run: {profile.LastRunAt ? new Date(profile.LastRunAt).toLocaleDateString() : "Never"}</div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => handleLaunch(profile.Id)}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Launch Profile
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Bulk selection functions
  const handleSelectProfile = (profileId: string, checked: boolean) => {
    const newSelected = new Set(selectedProfiles);
    if (checked) {
      newSelected.add(profileId);
    } else {
      newSelected.delete(profileId);
    }
    setSelectedProfiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProfiles(new Set(currentPageProfiles.map(p => p.Id)));
    } else {
      setSelectedProfiles(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedProfiles(new Set());
  };

  // Bulk operations
  const handleBulkAction = (action: 'export' | 'group' | 'extension' | 'proxy' | 'delete' | 'bookmark') => {
    if (selectedProfiles.size === 0) {
      toast.error("Vui lòng chọn ít nhất một profile");
      return;
    }
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedProfiles.size === 0) return;
    
    setIsProcessingBulk(true);
    const selectedIds = Array.from(selectedProfiles);
    
    try {
      switch (bulkAction) {
        case 'export':
          await handleBulkExportCookies(selectedIds);
          break;
        case 'group':
          await handleBulkGroupAssignment(selectedIds, bulkGroupId);
          break;
        case 'extension':
          await handleBulkExtensionUpdate(selectedIds, bulkExtensionData);
          break;
        case 'proxy':
          await handleBulkProxyAssignment(selectedIds, bulkProxyId);
          break;
        case 'delete':
          await handleBulkDelete(selectedIds);
          break;
        case 'bookmark':
          await handleBulkBookmarkUpdate(selectedIds, bulkBookmarkData);
          break;
      }
      
      setBulkActionDialogOpen(false);
      clearSelection();
      await fetchAllData();
      
    } catch (error: any) {
      toast.error(`Lỗi thực hiện thao tác: ${error.message}`);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Bulk operation implementations
  const handleBulkExportCookies = async (profileIds: string[]) => {
    const allCookies: any = {};
    
    for (const profileId of profileIds) {
      try {
        const cookieData = await window.api.invoke("profiles:exportCookie", profileId);
        allCookies[profileId] = JSON.parse(cookieData as string);
        toast.success(`✅ Exported cookies cho profile ${profileId}`);
      } catch (error: any) {
        toast.error(`❌ Lỗi export profile ${profileId}: ${error.message}`);
      }
    }
    
    const blob = new Blob([JSON.stringify(allCookies, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk_cookies_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`🎉 Đã export cookies của ${profileIds.length} profiles`);
  };

  const handleBulkGroupAssignment = async (profileIds: string[], groupId: string) => {
    const groupIdNumber = groupId === 'none' ? null : Number(groupId);
    let successCount = 0;
    
    for (const profileId of profileIds) {
      try {
        const profile = profiles.find(p => p.Id === profileId);
        if (profile) {
          const updateResult = await window.api.invoke("profiles:update", { ...profile, GroupId: groupIdNumber });
          if (updateResult === true) {
            successCount++;
          } else {
            toast.error(`❌ Lỗi cập nhật nhóm cho profile ${profileId}: Server không xác nhận`);
          }
        }
      } catch (error: any) {
        toast.error(`❌ Lỗi cập nhật nhóm cho profile ${profileId}: ${error.message}`);
      }
    }
    
    if (successCount > 0) {
      const groupName = groups.find(g => g.Id === groupIdNumber)?.Name || 'Không có nhóm';
      toast.success(`🎉 Đã gán ${successCount}/${profileIds.length} profiles vào nhóm ${groupName}`);
    }
  };

  const handleBulkExtensionUpdate = async (profileIds: string[], extensionData: string) => {
    try {
      const extensions = JSON.parse(extensionData);
      let successCount = 0;
      
      for (const profileId of profileIds) {
        try {
          const profile = profiles.find(p => p.Id === profileId);
          if (profile) {
            const jsonData = JSON.parse(profile.JsonData || '{}');
            jsonData.extensions = extensions;
            
            const updateResult = await window.api.invoke("profiles:update", {
              ...profile,
              JsonData: JSON.stringify(jsonData)
            });
            
            if (updateResult === true) {
              successCount++;
            } else {
              toast.error(`❌ Lỗi cập nhật extension cho profile ${profileId}: Server không xác nhận`);
            }
          }
        } catch (error: any) {
          toast.error(`❌ Lỗi cập nhật extension cho profile ${profileId}: ${error.message}`);
        }
      }
      
      if (successCount > 0) {
        toast.success(`🎉 Đã cập nhật extensions cho ${successCount}/${profileIds.length} profiles`);
      }
    } catch (error) {
      toast.error("❌ Dữ liệu extension không hợp lệ (phải là JSON)");
    }
  };

  const handleBulkProxyAssignment = async (profileIds: string[], proxyId: string) => {
    const proxy = proxies.find(p => String(p.id) === proxyId);
    let successCount = 0;
    
    for (const profileId of profileIds) {
      try {
        const profile = profiles.find(p => p.Id === profileId);
        if (profile) {
          const jsonData = JSON.parse(profile.JsonData || '{}');
          
          if (proxyId === 'none') {
            jsonData.proxyEnabled = false;
            jsonData.proxy = null;
          } else if (proxy) {
            jsonData.proxyEnabled = true;
            jsonData.proxy = {
              mode: proxy.type,
              host: proxy.host,
              port: proxy.port,
              username: proxy.username || '',
              password: proxy.password || ''
            };
          }
          
          const updateResult = await window.api.invoke("profiles:update", {
            ...profile,
            JsonData: JSON.stringify(jsonData)
          });
          
          if (updateResult === true) {
            successCount++;
          } else {
            toast.error(`❌ Lỗi cập nhật proxy cho profile ${profileId}: Server không xác nhận`);
          }
        }
      } catch (error: any) {
        toast.error(`❌ Lỗi cập nhật proxy cho profile ${profileId}: ${error.message}`);
      }
    }
    
    if (successCount > 0) {
      const proxyName = proxy ? `${proxy.host}:${proxy.port}` : 'Local IP';
      toast.success(`🎉 Đã gán proxy ${proxyName} cho ${successCount}/${profileIds.length} profiles`);
    }
  };

  const handleBulkDelete = async (profileIds: string[]) => {
    for (const profileId of profileIds) {
      try {
        await window.api.invoke("profiles:delete", profileId);
      } catch (error: any) {
        toast.error(`❌ Lỗi xoá profile ${profileId}: ${error.message}`);
      }
    }
    
    toast.success(`🎉 Đã xoá ${profileIds.length} profiles`);
  };

  const handleBulkBookmarkUpdate = async (profileIds: string[], bookmarkData: string) => {
    try {
      const bookmarks = JSON.parse(bookmarkData);
      let successCount = 0;
      
      for (const profileId of profileIds) {
        try {
          const profile = profiles.find(p => p.Id === profileId);
          if (profile) {
            const jsonData = JSON.parse(profile.JsonData || '{}');
            jsonData.bookmarks = bookmarks;
            
            const updateResult = await window.api.invoke("profiles:update", {
              ...profile,
              JsonData: JSON.stringify(jsonData)
            });
            
            if (updateResult === true) {
              successCount++;
            } else {
              toast.error(`❌ Lỗi cập nhật bookmarks cho profile ${profileId}: Server không xác nhận`);
            }
          }
        } catch (error: any) {
          toast.error(`❌ Lỗi cập nhật bookmarks cho profile ${profileId}: ${error.message}`);
        }
      }
      
      if (successCount > 0) {
        toast.success(`🎉 Đã cập nhật bookmarks cho ${successCount}/${profileIds.length} profiles`);
      }
    } catch (error) {
      toast.error("❌ Dữ liệu bookmarks không hợp lệ (phải là JSON)");
    }
  };

  // Check if all current page profiles are selected
  const isAllSelected = currentPageProfiles.length > 0 && 
    currentPageProfiles.every(profile => selectedProfiles.has(profile.Id));
  
  const isPartiallySelected = currentPageProfiles.some(profile => selectedProfiles.has(profile.Id)) && !isAllSelected;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none p-4 md:p-6 border-b bg-background">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Profiles</CardTitle>
                <CardDescription>
                  Quản lý và khởi chạy profiles Chrome. ({totalItems} profiles)
                </CardDescription>
              </div>
              <div>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo Profile
                </Button>
              </div>
            </div>
            
            
            
            {/* Filters */}
            <div className="space-y-4">
              {/* Search and Group Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Tìm kiếm theo tên..."
                  className="max-w-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Lọc theo nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nhóm</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.Id} value={String(g.Id)}>
                        {g.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Sắp xếp theo ngày tạo:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={createAtOrder === "newest" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateAtOrder("newest")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Mới nhất
                    </Button>
                    <Button
                      variant={createAtOrder === "oldest" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateAtOrder("oldest")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Cũ nhất
                    </Button>
                    {createAtOrder !== "default" && (
                      <Button variant="ghost" size="sm" onClick={clearCreateAtOrder}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Hiển thị:</span>
                <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">mục mỗi trang</span>
              </div>
            </div>
            </div>
            {/* Bulk Actions Bar */}
            {selectedProfiles.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Đã chọn {selectedProfiles.size} profile(s)
                </span>
                <div className="flex gap-1 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('export')}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export Cookies
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('group')}
                    className="text-xs"
                  >
                    <Server className="w-3 h-3 mr-1" />
                    Gom nhóm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('extension')}
                    className="text-xs"
                  >
                    <Monitor className="w-3 h-3 mr-1" />
                    Extensions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('proxy')}
                    className="text-xs"
                  >
                    <Server className="w-3 h-3 mr-1" />
                    Proxy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('bookmark')}
                    className="text-xs"
                  >
                    <Server className="w-3 h-3 mr-1" />
                    Bookmarks
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Xoá
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    Huỷ chọn
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Card className="h-full">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col.key}>
                            {col.key === 'select' ? (
                              <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                                ref={isPartiallySelected ? (ref) => {
                                  if (ref) (ref as any).indeterminate = true;
                                } : undefined}
                              />
                            ) : col.sortable ? (
                              <Button variant="ghost" onClick={() => requestSort(col.sortKey!)}>
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
                      {currentPageProfiles.map((profile) => {
                        const isSelected = selectedProfiles.has(profile.Id);
                        return (
                          <TableRow key={profile.Id} className={isSelected ? 'bg-blue-50 dark:bg-blue-950' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectProfile(profile.Id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[200px]">{profile.Name}</span>
                                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openDialog(profile)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {profile.GroupId ? (
                                <Badge variant="outline">
                                  {groups.find(g => g.Id === profile.GroupId)?.Name ?? 'Không xác định'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Không có nhóm</Badge>
                              )}
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
                                  onClick={() => openNotesDialog(profile)}
                                  title="Sửa ghi chú"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {profile.ProfilePath ? <Server className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                            </TableCell>
                            <TableCell><Badge variant="outline">Win</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const status = browserStatuses[profile.Id];
                                  const badge = getStatusBadge(status);
                                  return (
                                    <Badge variant={badge.variant} className="flex items-center gap-1">
                                      {badge.icon}
                                      {badge.text}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[150px] truncate">
                                {profile.JsonData ? (
                                  (() => {
                                    try {
                                      const jsonData = JSON.parse(profile.JsonData);
                                      return jsonData.proxyEnabled ? 
                                        `${jsonData.proxy.mode.toUpperCase()}|${jsonData.proxy.host}:${jsonData.proxy.port}` : 
                                        <span>Local IP</span>;
                                    } catch {
                                      return <span>Local IP</span>;
                                    }
                                  })()
                                ) : (
                                  <span>Local IP</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">
                            {formatShortTime(profile.LastRunAt ?? "")}
                          </span>
                          {profile.LastRunAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(profile.LastRunAt).toLocaleString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const status = browserStatuses[profile.Id];
                                  const isRunning = status?.status === 'running';
                                  const isStarting = status?.status === 'starting';
                                  const isStopping = status?.status === 'stopping';
                                  
                                  if (isRunning) {
                                    return (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleStopProfile(profile.Id)}
                                          disabled={isStopping}
                                          title="Dừng browser"
                                        >
                                          <Square className="h-4 w-4 text-red-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRestartProfile(profile.Id)}
                                          title="Khởi động lại browser"
                                        >
                                          <RotateCcw className="h-4 w-4 text-blue-500" />
                                        </Button>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleLaunch(profile.Id)}
                                        disabled={isStarting || launchingProfileId === profile.Id}
                                        title="Khởi động browser"
                                      >
                                        {isStarting || launchingProfileId === profile.Id ? (
                                          <Play className="h-4 w-4 animate-pulse text-blue-500" />
                                        ) : (
                                          <PlayCircle className="h-4 w-4 text-green-500" />
                                        )}
                                      </Button>
                                    );
                                  }
                                })()}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => openDialog(profile)}>
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleImportCookie(profile.Id)}>
                                      Import Cookie
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportCookie(profile.Id)}>
                                      Export Cookie
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(profile.Id)}
                                      className="text-red-500"
                                      disabled={deletingProfileId === profile.Id}
                                    >
                                      {deletingProfileId === profile.Id ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete"
                                      )}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden grid gap-4 sm:grid-cols-2">
                  {currentPageProfiles.map((profile) => (
                    <ProfileCard key={profile.Id} profile={profile} />
                  ))}
                </div>

                {/* Empty State */}
                {currentPageProfiles.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Không tìm thấy profile nào</p>
                                         {searchQuery || groupFilter !== "all" || createAtOrder !== "default" ? (
                       <Button onClick={() => {
                         setSearchQuery("");
                         setGroupFilter("all");
                         setCreateAtOrder("default");
                       }} className="mt-4" variant="outline">
                         Xóa bộ lọc
                       </Button>
                    ) : (
                      <Button onClick={() => openDialog()} className="mt-4" variant="outline">
                        Tạo profile đầu tiên
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
          
          {/* Fixed Footer with Pagination */}
          {totalPages > 1 && (
            <CardFooter className="border-t bg-background">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                <div className="text-xs text-muted-foreground">
                  Hiển thị <strong>{startIndex + 1}</strong> đến <strong>{Math.min(endIndex, totalItems)}</strong> của <strong>{totalItems}</strong> profiles.
                </div>
                                 <CustomPagination
                   currentPage={currentPage}
                   totalPages={totalPages}
                   onPageChange={setCurrentPage}
                 />
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onEscapeKeyDown={closeDialog}>
          <form onSubmit={handleSave} key={currentProfile?.Id || 'new'}>
            <DialogHeader>
              <DialogTitle>{currentProfile ? "Chỉnh sửa Profile" : "Tạo Profile mới"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên Profile</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={currentProfile?.Name || ""} 
                  required 
                  maxLength={50}
                  placeholder="Nhập tên profile (chữ, số, khoảng trắng, -, _, .)"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">Nhóm</Label>
                <Select 
                  name="group" 
                  defaultValue={
                    currentProfile?.GroupId !== null && currentProfile?.GroupId !== undefined 
                      ? String(currentProfile.GroupId)
                      : groups.length > 0 ? String(groups[0].Id) : "1"
                  }
                >
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Chọn nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.Id} value={String(g.Id)}>
                        {g.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxy">Proxy (Tùy chọn)</Label>
                <Select name="proxy" defaultValue={getCurrentProxy(currentProfile)}>
                  <SelectTrigger id="proxy">
                    <SelectValue placeholder="Chọn proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không proxy</SelectItem>
                    {proxies.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.host}:{p.port}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>Hủy</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang lưu...
                  </>
                ) : (
                  "Lưu"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'export' && `Export Cookies (${selectedProfiles.size} profiles)`}
              {bulkAction === 'group' && `Gán nhóm (${selectedProfiles.size} profiles)`}
              {bulkAction === 'extension' && `Cập nhật Extensions (${selectedProfiles.size} profiles)`}
              {bulkAction === 'proxy' && `Gán Proxy (${selectedProfiles.size} profiles)`}
              {bulkAction === 'bookmark' && `Cập nhật Bookmarks (${selectedProfiles.size} profiles)`}
              {bulkAction === 'delete' && `Xoá Profiles (${selectedProfiles.size} profiles)`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {bulkAction === 'export' && (
              <div className="text-center">
                <p>Tất cả cookies sẽ được export thành một file JSON.</p>
                <p className="text-sm text-gray-500 mt-2">
                  File sẽ có format: {`{profileId: [cookies], ...}`}
                </p>
              </div>
            )}
            
            {bulkAction === 'group' && (
              <div className="space-y-2">
                <Label htmlFor="bulkGroup">Chọn nhóm mới</Label>
                <Select value={bulkGroupId} onValueChange={setBulkGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có nhóm</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.Id} value={String(g.Id)}>
                        {g.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {bulkAction === 'extension' && (
              <div className="space-y-2">
                <Label htmlFor="bulkExtension">Extensions Data (JSON format)</Label>
                <textarea
                  id="bulkExtension"
                  value={bulkExtensionData}
                  onChange={(e) => setBulkExtensionData(e.target.value)}
                  placeholder={`[\n  {"id": "extension-id", "enabled": true},\n  {"id": "another-extension", "enabled": false}\n]`}
                  className="min-h-[120px] w-full p-3 border rounded-md font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Nhập dữ liệu extensions dưới dạng JSON array
                </p>
              </div>
            )}
            
            {bulkAction === 'proxy' && (
              <div className="space-y-2">
                <Label htmlFor="bulkProxy">Chọn proxy</Label>
                <Select value={bulkProxyId} onValueChange={setBulkProxyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn proxy" />
                  </SelectTrigger>
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
            
            {bulkAction === 'bookmark' && (
              <div className="space-y-2">
                <Label htmlFor="bulkBookmark">Bookmarks Data (JSON format)</Label>
                <textarea
                  id="bulkBookmark"
                  value={bulkBookmarkData}
                  onChange={(e) => setBulkBookmarkData(e.target.value)}
                  placeholder={`[\n  {"name": "Google", "url": "https://google.com"},\n  {"name": "YouTube", "url": "https://youtube.com"}\n]`}
                  className="min-h-[120px] w-full p-3 border rounded-md font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Nhập dữ liệu bookmarks dưới dạng JSON array
                </p>
              </div>
            )}
            
            {bulkAction === 'delete' && (
              <div className="text-center">
                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-red-700 dark:text-red-300 font-semibold mb-2">
                    ⚠️ Cảnh báo: Hành động không thể hoàn tác!
                  </p>
                  <p className="text-red-600 dark:text-red-400">
                    Bạn sắp xoá {selectedProfiles.size} profile(s). 
                    Tất cả dữ liệu profile sẽ bị mất vĩnh viễn.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setBulkActionDialogOpen(false)}
              disabled={isProcessingBulk}
            >
              Hủy
            </Button>
            <Button 
              onClick={executeBulkAction}
              disabled={isProcessingBulk || (
                (bulkAction === 'group' && !bulkGroupId) ||
                (bulkAction === 'extension' && !bulkExtensionData.trim()) ||
                (bulkAction === 'proxy' && !bulkProxyId) ||
                (bulkAction === 'bookmark' && !bulkBookmarkData.trim())
              )}
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
            >
              {isProcessingBulk ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                `Thực hiện (${selectedProfiles.size} profiles)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={(open) => {
        if (!open) {
          closeNotesDialog();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Sửa ghi chú cho Profile: {currentNotesProfile?.Name || "Unknown"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notesField">Ghi chú</Label>
              <Textarea
                id="notesField"
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Nhập ghi chú cho profile..."
                rows={5}
                maxLength={200}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {notesValue.length}/200 ký tự
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeNotesDialog}>
              Hủy
            </Button>
            <Button onClick={handleSaveNotes} disabled={!currentNotesProfile}>
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilesPage; 