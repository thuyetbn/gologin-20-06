
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
import { useCachedData } from "@/hooks/use-cached-data";

import { ArrowUpDown, Folder, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

// Redefine interface here for simplicity as it's moved to backend
export interface Group {
  Id: number;
  Name: string;
  Description?: string;
  CreatedAt?: string;
  ProfileCount?: number;
}

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

  // Pagination state  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  // Process groups with profile counts and filtering
  const processedGroups = useMemo(() => {
    // Add profile counts to groups
    const groupsWithCount = allGroups.map((group: Group) => ({
      ...group,
      ProfileCount: profiles.filter((p: any) => p.GroupId === group.Id).length,
    }));

    // Apply search filter
    if (debouncedSearchQuery) {
      return groupsWithCount.filter((group) =>
        group.Name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    return groupsWithCount;
  }, [allGroups, profiles, debouncedSearchQuery]);

  // Replace fetchAllData with refreshCache
  const fetchAllData = async () => {
    console.log('🔄 [Groups] Refreshing cached data...');
    await refreshCache();
  };

  // Remove initial data loading useEffect - handled by useCachedData

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get("name") as string,
    };

    // Basic input processing
    setFormErrors({});
    
    if (!rawData.name || rawData.name.trim().length === 0) {
      setFormErrors({ name: "Group name is required" });
      return;
    }

    const trimmedName = rawData.name.trim();
    if (trimmedName.length > 30) {
      setFormErrors({ name: "Group name must be 30 characters or less" });
      return;
    }

    const groupData = {
      Name: trimmedName
    };

    setIsSaving(true);
    try {
      if (currentGroup) {
        const updatedGroup = { ...currentGroup, ...groupData };
        await window.api.invoke("groups:update", updatedGroup);
        // Update local cache for instant UI feedback
        updateLocalGroup(updatedGroup);
        toast.success("Group updated successfully!");
      } else {
        const newGroup = await window.api.invoke("groups:create", groupData);
        // Add to local cache for instant UI feedback  
        addLocalGroup(newGroup);
        toast.success("Group created successfully!");
      }
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (groupId: number) => {
    setDeletingGroupId(groupId);
    try {
      await window.api.invoke("groups:delete", groupId);
      // Remove from local cache for instant UI feedback
      removeLocalGroup(groupId);
      toast.success("Group deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete group");
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

  // Mobile Card Component
  const GroupCard = ({ group }: { group: Group }) => {
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
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openDialog(group)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(group.Id)}
                  className="text-red-500"
                  disabled={deletingGroupId === group.Id}
                >
                  {deletingGroupId === group.Id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
            Created: {group.CreatedAt ? new Date(group.CreatedAt).toLocaleDateString() : "N/A"}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>
                Organize your profiles into groups. ({allGroups.length} groups)
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </div>
          
          {/* Search */}
          <div className="mt-4">
            <Input
              placeholder="Search groups..."
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
                    <Button variant="ghost">
                      Name <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Profile Count</TableHead>
                  <TableHead>Created At</TableHead>
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
                        {group.Description || "No description"}
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDialog(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(group.Id)}
                            className="text-red-500"
                            disabled={deletingGroupId === group.Id}
                          >
                            {deletingGroupId === group.Id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
              <GroupCard key={group.Id} group={group} />
            ))}
          </div>

          {/* Empty State */}
          {processedGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No groups found</p>
              <Button onClick={() => openDialog()} className="mt-4" variant="outline">
                Create your first group
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{processedGroups.length}</strong> of <strong>{allGroups.length}</strong> groups.
          </div>
        </CardFooter>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {currentGroup ? "Edit Group" : "Create New Group"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={currentGroup?.Name} 
                  required 
                  maxLength={30}
                  placeholder="Enter group name (letters, numbers, spaces, -, _)"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={currentGroup?.Description}
                  placeholder="Enter group description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save"
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