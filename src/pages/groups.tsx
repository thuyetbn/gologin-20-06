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
import { sanitizeInput, validateForm, validationRules } from "@/lib/validation";
import { ArrowUpDown, Folder, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Redefine interface here for simplicity as it's moved to backend
export interface Group {
  Id: number;
  Name: string;
  Description?: string;
  CreatedAt?: string;
  ProfileCount?: number;
}

const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await window.api.invoke("groups:get");
      // Get profile counts for each group
      const profiles = await window.api.invoke("profiles:get");
      
      const groupsWithCount = fetchedGroups.map((group: Group) => ({
        ...group,
        ProfileCount: profiles.filter((p: any) => p.GroupId === group.Id).length,
      }));
      
      setGroups(groupsWithCount || []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      toast.error("Failed to fetch groups");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter((group) =>
    group.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get("name") as string,
    };

    // Validate form data
    const errors = validateForm(rawData, {
      name: validationRules.groupName,
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please correct the validation errors");
      return;
    }

    // Clear errors and sanitize data
    setFormErrors({});
    const groupData = {
      Name: sanitizeInput(rawData.name),
    };

    try {
      if (currentGroup) {
        await window.api.invoke("groups:update", { ...currentGroup, ...groupData });
        toast.success("Group updated successfully!");
      } else {
        await window.api.invoke("groups:create", groupData);
        toast.success("Group created successfully!");
      }
      await fetchGroups();
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save group");
    }
  };

  const handleDelete = async (groupId: number) => {
    try {
      await window.api.invoke("groups:delete", groupId);
      toast.success("Group deleted successfully!");
      await fetchGroups();
    } catch (error: any) {
      toast.error(`Failed to delete group: ${error.message}`);
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
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
                Organize your profiles into groups. ({filteredGroups.length} groups)
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
                {filteredGroups.map((group) => (
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
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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
            {filteredGroups.map((group) => (
              <GroupCard key={group.Id} group={group} />
            ))}
          </div>

          {/* Empty State */}
          {filteredGroups.length === 0 && (
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
            Showing <strong>{filteredGroups.length}</strong> of <strong>{groups.length}</strong> groups.
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
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupsPage; 