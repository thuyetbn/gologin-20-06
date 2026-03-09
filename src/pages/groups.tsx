
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCachedData, type Profile, type Group } from "@/hooks/use-cached-data";

import { Folder, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

// Extracted outside render to avoid re-creation on every render
interface GroupCardProps {
  group: Group;
  onEdit: (group: Group) => void;
  onDelete: (groupId: number) => void;
  deletingGroupId: number | null;
}

const GroupCard = ({ group, onEdit, onDelete, deletingGroupId }: GroupCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{group.Name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  {group.ProfileCount || 0} profiles
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(group)}>
                <Pencil className="mr-2 h-4 w-4" />
                Sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(group.Id)}
                className="text-red-500"
                disabled={deletingGroupId === group.Id}
              >
                {deletingGroupId === group.Id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {group.Description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{group.Description}</p>
        </CardContent>
      )}

      <CardFooter className="pt-0">
        <div className="text-xs text-muted-foreground">
          Ngày tạo: {group.CreatedAt ? new Date(group.CreatedAt).toLocaleDateString('vi-VN') : "N/A"}
        </div>
      </CardFooter>
    </Card>
  );
};

const GroupsPage = () => {
  // Use optimized cached data hook
  const {
    groups: allGroups,
    profiles,
    isLoading,
    refreshCache,
    updateLocalGroup,
    addLocalGroup,
    removeLocalGroup
  } = useCachedData();

  // UI state
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  // Process groups with profile counts and filtering
  const processedGroups = useMemo(() => {
    // Add profile counts to groups
    const groupsWithCount = allGroups.map((group: Group) => ({
      ...group,
      ProfileCount: profiles.filter((p: Profile) => p.GroupId === group.Id).length,
    }));

    // Apply search filter
    if (debouncedSearchQuery) {
      return groupsWithCount.filter((group) =>
        group.Name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    return groupsWithCount;
  }, [allGroups, profiles, debouncedSearchQuery]);

  // Remove initial data loading useEffect - handled by useCachedData

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };

    // Basic input processing
    setFormErrors({});
    
    if (!rawData.name || rawData.name.trim().length === 0) {
      setFormErrors({ name: "Tên nhóm không được để trống" });
      return;
    }

    const trimmedName = rawData.name.trim();
    if (trimmedName.length > 30) {
      setFormErrors({ name: "Tên nhóm tối đa 30 ký tự" });
      return;
    }

    const groupData = {
      Name: trimmedName,
      Description: rawData.description?.trim() || '',
    };

    setIsSaving(true);
    try {
      if (currentGroup) {
        const updatedGroup = { ...currentGroup, ...groupData };
        await window.api.invoke("groups:update", updatedGroup);
        // Update local cache for instant UI feedback
        updateLocalGroup(updatedGroup);
        toast.success("Cập nhật nhóm thành công!");
      } else {
        const newGroupId = await window.api.invoke("groups:create", groupData);
        // Construct proper Group object from returned ID
        const newGroup = { Id: newGroupId, Name: groupData.Name, Description: groupData.Description, CreatedAt: new Date().toISOString() };
        // Add to local cache for instant UI feedback
        addLocalGroup(newGroup);
        toast.success("Tạo nhóm thành công!");
      }
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Lưu nhóm thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (groupId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhóm này?')) return;
    setDeletingGroupId(groupId);
    try {
      await window.api.invoke("groups:delete", groupId);
      // Remove from local cache for instant UI feedback
      removeLocalGroup(groupId);
      toast.success("Xóa nhóm thành công!");
    } catch (error: any) {
      toast.error(error.message || "Xóa nhóm thất bại");
      // Refresh cache if delete failed
      await refreshCache();
    } finally {
      setDeletingGroupId(null);
    }
  };

  const openDialog = (group: Group | null = null) => {
    setCurrentGroup(group);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCurrentGroup(null);
    setFormErrors({});
  };

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Nhóm</CardTitle>
              <CardDescription>
                Sắp xếp profiles theo nhóm. ({allGroups.length} nhóm)
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo nhóm
            </Button>
          </div>
          
          {/* Search */}
          <div className="mt-4">
            <Input
              placeholder="Tìm kiếm nhóm..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Tên
                  </TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Số profiles</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedGroups.map((group) => (
                  <TableRow key={group.Id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Folder className="h-4 w-4" />
                        {group.Name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {group.Description || "Không có mô tả"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {group.ProfileCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {group.CreatedAt ? new Date(group.CreatedAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDialog(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(group.Id)}
                            className="text-red-500"
                            disabled={deletingGroupId === group.Id}
                          >
                            {deletingGroupId === group.Id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                Đang xóa...
                              </>
                            ) : (
                              <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid gap-4 sm:grid-cols-2">
            {processedGroups.map((group) => (
              <GroupCard key={group.Id} group={group} onEdit={openDialog} onDelete={handleDelete} deletingGroupId={deletingGroupId} />
            ))}
          </div>

          {/* Empty State */}
          {processedGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Không tìm thấy nhóm nào</p>
              <Button onClick={() => openDialog()} className="mt-4" variant="outline">
                Tạo nhóm đầu tiên
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{processedGroups.length}</strong> / <strong>{allGroups.length}</strong> nhóm.
          </div>
        </CardFooter>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {currentGroup ? "Sửa nhóm" : "Tạo nhóm mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên nhóm</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={currentGroup?.Name} 
                  required 
                  maxLength={30}
                  placeholder="Nhập tên nhóm (chữ, số, dấu cách, -, _)"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả (Tùy chọn)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={currentGroup?.Description}
                  placeholder="Nhập mô tả nhóm"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Hủy
              </Button>
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
    </div>
  );
};

export default GroupsPage; 