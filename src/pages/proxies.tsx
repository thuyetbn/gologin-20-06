"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
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

import {
  CheckCircle,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  Trash2,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import { Proxy } from "@/hooks/use-cached-data";

const ProxiesPage = () => {
  // Use basic state for proxies since cached hook doesn't fully support proxies yet
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentProxy, setCurrentProxy] = useState<Proxy | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProxyId, setDeletingProxyId] = useState<string | null>(null);
  const [testingProxyId, setTestingProxyId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch proxies data
  const fetchProxies = async () => {
    console.log('🔄 [Proxies] Fetching proxies data...');
    setIsLoading(true);
    try {
      const fetchedProxies = await window.api.invoke("proxies:get");
      setProxies(Array.isArray(fetchedProxies) ? fetchedProxies : []);
    } catch (error) {
      console.error("Failed to fetch proxies:", error);
      toast.error("Failed to fetch proxies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProxies();
  }, []);

  // Filter and search
  const filteredProxies = useMemo(() => {
    return proxies.filter((proxy) => {
      const matchesSearch = debouncedSearchQuery === "" || 
        (proxy.name?.toLowerCase() || "").includes(debouncedSearchQuery.toLowerCase()) ||
        (proxy.host?.toLowerCase() || "").includes(debouncedSearchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || proxy.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [proxies, debouncedSearchQuery, typeFilter]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      type: formData.get("type") as string,
      host: formData.get("host") as string,
      port: formData.get("port") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };

    // Clear previous errors
    setFormErrors({});

    // Basic input checking
    if (!rawData.type?.trim()) {
      setFormErrors({ type: "Type is required" });
      return;
    }
    if (!rawData.host?.trim()) {
      setFormErrors({ host: "Host is required" });
      return;
    }
    if (!rawData.port?.trim()) {
      setFormErrors({ port: "Port is required" });
      return;
    }

    const port = parseInt(rawData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      setFormErrors({ port: "Port must be between 1 and 65535" });
      return;
    }

    // Auto-generate name from host:port
    const autoName = `${rawData.host.trim()}:${port}`;

    const proxyData: Proxy = {
      id: currentProxy?.id || Date.now().toString(),
      name: autoName,
      type: rawData.type as Proxy["type"],
      host: rawData.host.trim(),
      port: port,
      username: rawData.username ? rawData.username.trim() : "",
      password: rawData.password || "",
    };

    setIsSaving(true);
    try {
      if (currentProxy) {
        // Update existing proxy using standard proxies:set endpoint
        const updatedProxies = proxies.map(p => 
          p.id === currentProxy.id ? proxyData : p
        );
        await window.api.invoke("proxies:set", updatedProxies);
        setProxies(updatedProxies);
        toast.success("Proxy updated successfully!");
      } else {
        // Create new proxy
        const updatedProxies = [...proxies, proxyData];
        await window.api.invoke("proxies:set", updatedProxies);
        setProxies(updatedProxies);
        toast.success("Proxy created successfully!");
      }
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save proxy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (proxyId: string) => {
    setDeletingProxyId(proxyId);
    try {
      const updatedProxies = proxies.filter(p => p.id !== proxyId);
      await window.api.invoke("proxies:set", updatedProxies);
      setProxies(updatedProxies);
      toast.success("Proxy deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete proxy");
    } finally {
      setDeletingProxyId(null);
    }
  };

  const testProxy = async (proxy: Proxy) => {
    setTestingProxyId(proxy.id);
    try {
      // This would test the proxy connection
      toast.success(`Testing proxy ${proxy.name}...`);
      // You can implement actual proxy testing here
      
      // Simulate testing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Proxy ${proxy.name} test completed!`);
    } catch (error: any) {
      toast.error(`Failed to test proxy: ${error.message}`);
    } finally {
      setTestingProxyId(null);
    }
  };

  const openDialog = (proxy: Proxy | null = null) => {
    setCurrentProxy(proxy);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCurrentProxy(null);
    setFormErrors({});
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      http: "bg-blue-500",
      https: "bg-green-500", 
      socks4: "bg-purple-500",
      socks5: "bg-orange-500"
    };
    return (
      <Badge variant="secondary" className={colors[type as keyof typeof colors]}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  // Mobile Card Component
  const ProxyCard = ({ proxy }: { proxy: Proxy }) => {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{proxy.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(proxy.type)}
                  {getStatusBadge(proxy.status)}
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
                <DropdownMenuItem 
                  onClick={() => testProxy(proxy)}
                  disabled={testingProxyId === proxy.id}
                >
                  {testingProxyId === proxy.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog(proxy)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(proxy.id)}
                  className="text-red-500"
                  disabled={deletingProxyId === proxy.id}
                >
                  {deletingProxyId === proxy.id ? (
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
        
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Host:</span>
              <p className="font-medium">{proxy.host}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Port:</span>
              <p className="font-medium">{proxy.port}</p>
            </div>
          </div>
          
          {proxy.username && (
            <div>
              <span className="text-muted-foreground text-sm">Username:</span>
              <p className="text-sm font-medium">{proxy.username}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            Created: {proxy.CreatedAt ? new Date(proxy.CreatedAt).toLocaleDateString() : "N/A"}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => testProxy(proxy)}
            disabled={testingProxyId === proxy.id}
          >
            {testingProxyId === proxy.id ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                Testing...
              </>
            ) : (
              "Test"
            )}
          </Button>
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
              <CardTitle>Proxies</CardTitle>
              <CardDescription>
                Manage your proxy connections. ({proxies.length} proxies)
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Proxy
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Input
              placeholder="Search proxies..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
                <SelectItem value="socks4">SOCKS4</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    
                    <TableCell>{getTypeBadge(proxy.type)}</TableCell>
                    <TableCell className="font-mono text-sm">{proxy.host}</TableCell>
                    <TableCell className="font-mono text-sm">{proxy.port}</TableCell>
                    <TableCell className="text-sm">
                      {proxy.username ? (
                        <span className="font-mono">{proxy.username}</span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proxy.status)}
                        {getStatusBadge(proxy.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {proxy.CreatedAt ? new Date(proxy.CreatedAt).toLocaleDateString() : "N/A"}
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
                          <DropdownMenuItem 
                            onClick={() => testProxy(proxy)}
                            disabled={testingProxyId === proxy.id}
                          >
                            {testingProxyId === proxy.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                Testing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Test Connection
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDialog(proxy)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(proxy.id)}
                            className="text-red-500"
                            disabled={deletingProxyId === proxy.id}
                          >
                            {deletingProxyId === proxy.id ? (
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
            {filteredProxies.map((proxy) => (
              <ProxyCard key={proxy.id} proxy={proxy} />
            ))}
          </div>

          {/* Empty State */}
          {filteredProxies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No proxies found</p>
              <Button onClick={() => openDialog()} className="mt-4" variant="outline">
                Add your first proxy
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredProxies.length}</strong> of <strong>{proxies.length}</strong> proxies.
          </div>
        </CardFooter>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {currentProxy ? "Edit Proxy" : "Add New Proxy"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={currentProxy?.type || "http"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="socks4">SOCKS4</SelectItem>
                    <SelectItem value="socks5">SOCKS5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    name="host"
                    defaultValue={currentProxy?.host}
                    placeholder="proxy.example.com"
                    required
                    maxLength={255}
                    className={formErrors.host ? "border-red-500" : ""}
                  />
                  {formErrors.host && (
                    <p className="text-sm text-red-500">{formErrors.host}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    name="port"
                    type="number"
                    defaultValue={currentProxy?.port}
                    placeholder="8080"
                    required
                    min={1}
                    max={65535}
                    className={formErrors.port ? "border-red-500" : ""}
                  />
                  {formErrors.port && (
                    <p className="text-sm text-red-500">{formErrors.port}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username (Optional)</Label>
                  <Input
                    id="username"
                    name="username"
                    defaultValue={currentProxy?.username}
                    placeholder="Username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (Optional)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    defaultValue={currentProxy?.password}
                    placeholder="Password"
                  />
                </div>
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

export default ProxiesPage; 