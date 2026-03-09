import { BulkActionDialog } from "@/components/profiles/bulk-action-dialog";
import { NotesDialog } from "@/components/profiles/notes-dialog";
import { ProfileCard } from "@/components/profiles/profile-card";
import { ProfileDialog } from "@/components/profiles/profile-dialog";
import { ProfileTable } from "@/components/profiles/profile-table";
import {
  type BulkActionType,
  type SortableColumn,
  getProfileNotes,
} from "@/components/profiles/types";
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
import { CustomPagination } from "@/components/ui/custom-pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Profile, useCachedData } from "@/hooks/use-cached-data";
import { useBrowserStatuses } from "@/hooks/use-browser-statuses";
import { useProfileActions } from "@/hooks/use-profile-actions";

import {
  Calendar,
  Download,
  Globe,
  Monitor,
  Plus,
  Server,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

const ProfilesPage = () => {
  const {
    profiles,
    groups,
    proxies,
    isLoading,
    refreshCache,
    updateLocalProfile,
    addLocalProfile,
    removeLocalProfile,
  } = useCachedData();

  const browserStatuses = useBrowserStatuses();

  const actions = useProfileActions({
    profiles,
    proxies,
    groups,
    refreshCache,
    updateLocalProfile,
    addLocalProfile,
    removeLocalProfile,
  });

  // Dialog states
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

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

  // Bulk selection state
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
  const [bulkGroupId, setBulkGroupId] = useState('');
  const [bulkBookmarkData, setBulkBookmarkData] = useState('');
  const [bulkExtensionData, setBulkExtensionData] = useState('');
  const [bulkProxyId, setBulkProxyId] = useState('');
  const [bulkUserAgent, setBulkUserAgent] = useState('');

  // Notes dialog states
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNotesProfile, setCurrentNotesProfile] = useState<Profile | null>(null);
  const [notesValue, setNotesValue] = useState("");

  // Filtered and sorted profiles
  const processedProfiles = useMemo(() => {
    let items = [...profiles];

    if (debouncedSearchQuery) {
      items = items.filter((p) => p.Name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    }

    if (groupFilter !== "all") {
      items = items.filter((p) => String(p.GroupId) === groupFilter);
    }

    if (createAtOrder !== "default") {
      items.sort((a, b) => {
        const aDate = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
        const bDate = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
        return createAtOrder === "newest" ? bDate - aDate : aDate - bDate;
      });
    } else if (sortConfig) {
      items.sort((a, b) => {
        let aValue: string | number, bValue: string | number;
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

    return items;
  }, [profiles, debouncedSearchQuery, groupFilter, createAtOrder, sortConfig]);

  // Pagination calculations
  const totalItems = processedProfiles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageProfiles = processedProfiles.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, groupFilter, createAtOrder]);

  // Selection helpers
  const isAllSelected = currentPageProfiles.length > 0 &&
    currentPageProfiles.every(p => selectedProfiles.has(p.Id));
  const isPartiallySelected = currentPageProfiles.some(p => selectedProfiles.has(p.Id)) && !isAllSelected;

  const handleSelectProfile = (profileId: string, checked: boolean) => {
    const next = new Set(selectedProfiles);
    checked ? next.add(profileId) : next.delete(profileId);
    setSelectedProfiles(next);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProfiles(checked ? new Set(currentPageProfiles.map(p => p.Id)) : new Set());
  };

  const requestSort = (key: SortableColumn) => {
    const direction = sortConfig?.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending";
    setSortConfig({ key, direction });
  };

  // Dialog handlers
  const openDialog = (profile: Profile | null = null) => {
    setCurrentProfile(profile);
    setDialogOpen(true);
  };

  const openNotesDialog = (profile: Profile) => {
    setCurrentNotesProfile(profile);
    setNotesValue(getProfileNotes(profile));
    setNotesDialogOpen(true);
  };

  const handleUpdateUserAgent = (profileId: string) => {
    setSelectedProfiles(new Set([profileId]));
    setBulkAction('useragent');
    setBulkUserAgent('');
    setBulkActionDialogOpen(true);
  };

  const handleBulkAction = (action: BulkActionType) => {
    if (selectedProfiles.size === 0) {
      toast.error("Vui lòng chọn ít nhất một profile");
      return;
    }
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedProfiles.size === 0) return;
    await actions.executeBulkAction(bulkAction, Array.from(selectedProfiles), {
      groupId: bulkGroupId,
      extensionData: bulkExtensionData,
      proxyId: bulkProxyId,
      bookmarkData: bulkBookmarkData,
      userAgent: bulkUserAgent,
    });
    setBulkActionDialogOpen(false);
    setSelectedProfiles(new Set());
  };

  // Shared action props for table and card
  const actionProps = {
    launchingProfileId: actions.launchingProfileId,
    stoppingProfileId: actions.stoppingProfileId,
    deletingProfileId: actions.deletingProfileId,
    onEdit: openDialog,
    onEditNotes: openNotesDialog,
    onLaunch: actions.handleLaunch,
    onStop: actions.handleStop,
    onRestart: actions.handleRestart,
    onDelete: actions.handleDelete,
    onImportCookie: actions.handleImportCookie,
    onExportCookie: actions.handleExportCookie,
    onUpdateUserAgent: handleUpdateUserAgent,
  };

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
                      <SelectItem key={g.Id} value={String(g.Id)}>{g.Name}</SelectItem>
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
                      <Calendar className="mr-2 h-4 w-4" /> Mới nhất
                    </Button>
                    <Button
                      variant={createAtOrder === "oldest" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateAtOrder("oldest")}
                    >
                      <Calendar className="mr-2 h-4 w-4" /> Cũ nhất
                    </Button>
                    {createAtOrder !== "default" && (
                      <Button variant="ghost" size="sm" onClick={() => setCreateAtOrder("default")}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Hiển thị:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
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
                  Đã chọn {selectedProfiles.size} profile
                </span>
                <div className="flex gap-1 ml-auto">
                  {([
                    { action: 'export' as const, icon: Download, label: 'Xuất Cookies' },
                    { action: 'group' as const, icon: Server, label: 'Gom nhóm' },
                    { action: 'extension' as const, icon: Monitor, label: 'Extensions' },
                    { action: 'proxy' as const, icon: Server, label: 'Proxy' },
                    { action: 'bookmark' as const, icon: Server, label: 'Bookmarks' },
                    { action: 'useragent' as const, icon: Globe, label: 'Cập nhật UA' },
                  ]).map(({ action, icon: Icon, label }) => (
                    <Button key={action} size="sm" variant="outline" onClick={() => handleBulkAction(action)} className="text-xs">
                      <Icon className="w-3 h-3 mr-1" /> {label}
                    </Button>
                  ))}
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')} className="text-xs">
                    <X className="w-3 h-3 mr-1" /> Xoá
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedProfiles(new Set())} className="text-xs">
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
                  <ProfileTable
                    profiles={currentPageProfiles}
                    groups={groups}
                    browserStatuses={browserStatuses}
                    selectedProfiles={selectedProfiles}
                    isAllSelected={isAllSelected}
                    isPartiallySelected={isPartiallySelected}
                    onSelectAll={handleSelectAll}
                    onSelectProfile={handleSelectProfile}
                    onRequestSort={requestSort}
                    {...actionProps}
                  />
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden grid gap-4 sm:grid-cols-2">
                  {currentPageProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.Id}
                      profile={profile}
                      groups={groups}
                      browserStatus={browserStatuses[profile.Id]}
                      isSelected={selectedProfiles.has(profile.Id)}
                      onSelect={handleSelectProfile}
                      {...actionProps}
                    />
                  ))}
                </div>

                {/* Empty State */}
                {currentPageProfiles.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Không tìm thấy profile nào</p>
                    {searchQuery || groupFilter !== "all" || createAtOrder !== "default" ? (
                      <Button onClick={() => { setSearchQuery(""); setGroupFilter("all"); setCreateAtOrder("default"); }} className="mt-4" variant="outline">
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

      {/* Profile Create/Edit Dialog */}
      <ProfileDialog
        open={isDialogOpen}
        currentProfile={currentProfile}
        groups={groups}
        proxies={proxies}
        isSaving={actions.isSaving}
        onClose={() => { setDialogOpen(false); setCurrentProfile(null); }}
        onSave={actions.handleSave}
      />

      {/* Bulk Action Dialog */}
      <BulkActionDialog
        open={bulkActionDialogOpen}
        action={bulkAction}
        selectedCount={selectedProfiles.size}
        groups={groups}
        proxies={proxies}
        isProcessing={actions.isProcessingBulk}
        bulkGroupId={bulkGroupId}
        bulkBookmarkData={bulkBookmarkData}
        bulkExtensionData={bulkExtensionData}
        bulkProxyId={bulkProxyId}
        bulkUserAgent={bulkUserAgent}
        onGroupIdChange={setBulkGroupId}
        onBookmarkDataChange={setBulkBookmarkData}
        onExtensionDataChange={setBulkExtensionData}
        onProxyIdChange={setBulkProxyId}
        onUserAgentChange={setBulkUserAgent}
        onExecute={executeBulkAction}
        onClose={() => setBulkActionDialogOpen(false)}
      />

      {/* Notes Dialog */}
      <NotesDialog
        open={notesDialogOpen}
        profile={currentNotesProfile}
        value={notesValue}
        onChange={setNotesValue}
        onSave={() => {
          if (currentNotesProfile) {
            actions.handleSaveNotes(currentNotesProfile, notesValue, () => {
              setNotesDialogOpen(false);
              setCurrentNotesProfile(null);
              setNotesValue("");
            });
          }
        }}
        onClose={() => { setNotesDialogOpen(false); setCurrentNotesProfile(null); setNotesValue(""); }}
      />

    </div>
  );
};

export default ProfilesPage;
