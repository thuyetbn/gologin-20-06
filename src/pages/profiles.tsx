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
import { sanitizeInput, validateForm, validationRules } from "@/lib/validation";
import { ArrowUpDown, Calendar, CheckCircle, Download, Monitor, MoreHorizontal, Pencil, PlayCircle, Plus, Server, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { Proxy } from "./proxies";

// Redefine interfaces here for simplicity
export interface Group {
  Id: number;
  Name?: string;
}
export interface Profile {
  Id: string;
  Name: string;
  ProfilePath: string;
  JsonData: string;
  GroupId?: number;
  CreatedAt?: string;
  LastRunAt?: string;
  Group?: Group;
}

type SortableColumn = "Name" | "Group" | "LastRunAt" | "CreatedAt";

const ProfilesPage = () => {
  // State for data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  
  // State for loading
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
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

  // Fetch all data from backend
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [fetchedProfiles, fetchedGroups, fetchedProxies] = await Promise.all([
        window.api.invoke("profiles:get"),
        window.api.invoke("groups:get"),
        window.api.invoke("proxies:get"),
      ]);
      setProfiles(fetchedProfiles || []);
      setGroups(fetchedGroups || []);
      setProxies(fetchedProxies || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);



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
    };

    // Validate form data
    const errors = validateForm(rawData, {
      name: validationRules.profileName,
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please correct the validation errors");
      return;
    }

    // Clear errors and sanitize data
    setFormErrors({});
    const groupIdValue = rawData.group;
    const profileData = {
      Name: sanitizeInput(rawData.name),
      GroupId: groupIdValue === "none" ? null : Number(groupIdValue),
    };

    try {
      if (currentProfile) {
        await window.api.invoke("profiles:update", { ...currentProfile, ...profileData });
        toast.success("Profile updated successfully!");
      } else {
        await window.api.invoke("profiles:create", profileData);
        toast.success("Profile created successfully!");
      }
      await fetchAllData();
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    }
  };

  const handleDelete = async (profileId: string) => {
    await window.api.invoke("profiles:delete", profileId);
    toast.success("Profile deleted successfully!");
    await fetchAllData();
  };
  
  const handleLaunch = async (profileId: string) => {
    try {
      await window.api.invoke("profiles:launch", profileId);
      toast.success("Profile launched successfully!");
      await fetchAllData();
    } catch (error: any) {
      toast.error(`Error launching profile: ${error.message}`);
    }
  };

  const handleExportCookie = async (profileId: string) => {
    try {
      const cookieData = await window.api.invoke("profiles:exportCookie", profileId);
      const blob = new Blob([cookieData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cookies_${profileId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Cookies exported successfully!");
    } catch (error: any) {
      toast.error(`Failed to export cookies: ${error.message}`);
    }
  };

  const handleImportCookie = (profileId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileContent = event.target?.result as string;
          const rawCookies = JSON.parse(fileContent);
          await window.api.invoke("profiles:importCookie", { profileId, rawCookies });
          toast.success("Cookies imported successfully!");
        } catch (error: any) {
          toast.error(`Failed to import cookies: ${error.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const openDialog = (profile: Profile | null = null) => {
    setCurrentProfile(profile);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCurrentProfile(null);
    setFormErrors({});
  };

  const clearCreateAtOrder = () => {
    setCreateAtOrder("default");
  };

  const columns = [
    { key: "name", label: "Tên profile", sortable: true, sortKey: "Name" as SortableColumn },
    { key: "groups", label: "Nhóm", sortable: true, sortKey: "Group" as SortableColumn },
    { key: "storage", label: "Storage" },
    { key: "os", label: "OS" },
    { key: "status", label: "Trạng thái" },
    { key: "proxy", label: "Proxy" },
    { key: "createdAt", label: "Ngày tạo", sortable: true, sortKey: "CreatedAt" as SortableColumn },
    { key: "lastRun", label: "Lần chạy cuối", sortable: true, sortKey: "LastRunAt" as SortableColumn },
    { key: "action", label: "" },
  ];

  // Mobile Card Component
  const ProfileCard = ({ profile }: { profile: Profile }) => {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg truncate">{profile.Name}</CardTitle>
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
                >
                  Delete
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
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Sẵn sàng
            </Badge>
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
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo Profile
              </Button>
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
              </div>

              {/* CreateAt Order Filter */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
              </div>

              {/* Items per page */}
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
                            {col.sortable ? (
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
                      {currentPageProfiles.map((profile) => (
                        <TableRow key={profile.Id}>
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
                            {profile.ProfilePath ? <Server className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                          </TableCell>
                          <TableCell><Badge variant="outline">Win</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <Badge variant="outline" className="text-gray-400">Sẵn sàng</Badge>
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
                          <TableCell>{profile.CreatedAt ? new Date(profile.CreatedAt).toLocaleDateString() : "N/A"}</TableCell>
                          <TableCell>{profile.LastRunAt ? new Date(profile.LastRunAt).toLocaleDateString() : "Never"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleLaunch(profile.Id)}
                              >
                                <PlayCircle className="h-4 w-4 text-green-500" />
                              </Button>
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
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{currentProfile ? "Chỉnh sửa Profile" : "Tạo Profile mới"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên Profile</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={currentProfile?.Name} 
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
                <Select name="group" defaultValue={String(currentProfile?.GroupId || 1)}>
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
                <Select name="proxy">
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
              <Button type="button" variant="outline" onClick={closeDialog}>Hủy</Button>
              <Button type="submit">Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilesPage; 