
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
    Check,
    Database,
    Edit2,
    FolderOpen,
    HardDrive,
    Key,
    Plus,
    Save,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Simplified settings interface - only storage related
export interface Settings {
  dataPath: string;
  backupEnabled: boolean;
  backupInterval: number;
}

interface GoLoginToken {
  name: string;
  token: string;
}

const SettingsPage = () => {
  // State for settings
  const [settings, setSettings] = useState<Settings>({
    dataPath: "",
    backupEnabled: false,
    backupInterval: 24,
  });

  // Token management state
  const [tokens, setTokens] = useState<GoLoginToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenValue, setNewTokenValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editToken, setEditToken] = useState("");

  // Form state
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings and tokens on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const fetchedSettings = await window.api.invoke("settings:get") as any;
        if (fetchedSettings) {
          setSettings({
            dataPath: fetchedSettings.dataPath || "",
            backupEnabled: fetchedSettings.backupEnabled || false,
            backupInterval: fetchedSettings.backupInterval || 24,
          });
        }

        // Fetch tokens
        const fetchedTokens = await window.api.invoke("tokens:get") as GoLoginToken[];
        setTokens(fetchedTokens || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load settings");
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.api.invoke("settings:set", settings);
      setIsDirty(false);
      toast.success("Settings saved successfully!");
      
      // Refresh page to trigger setup check again
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataPathSelect = async () => {
    try {
      const result = await window.api.invoke("dialog:selectFolder") as any;
      if (result && !result.canceled && result.filePaths?.length > 0) {
        let selectedPath = result.filePaths[0];
        
        try {
          const dbSetupResult = await window.api.invoke("data:setupDatabase", selectedPath) as any;
          if (dbSetupResult.success) {
            const finalPath = dbSetupResult.normalizedPath || selectedPath;
            const newSettings = { ...settings, dataPath: finalPath };
            setSettings(newSettings);
            setIsDirty(true);
            
            if (dbSetupResult.existed) {
              toast.success("Thư mục đã được chọn. Database hiện có sẽ được sử dụng.");
            } else {
              toast.success("Thư mục đã được chọn và database đã được sao chép thành công!");
            }
            
            // Auto-save and reload tokens
            setTimeout(async () => {
              try {
                await window.api.invoke("settings:set", newSettings);
                const reloadedTokens = await window.api.invoke("tokens:reload") as GoLoginToken[];
                setTokens(reloadedTokens || []);
                window.location.reload();
              } catch (error) {
                console.error("Auto-save failed:", error);
              }
            }, 500);
          } else {
            throw new Error(dbSetupResult.message || "Failed to setup database");
          }
        } catch (dbError: any) {
          toast.error(`Lỗi khi thiết lập database: ${dbError.message}`);
          const newSettings = { ...settings, dataPath: selectedPath };
          setSettings(newSettings);
          setIsDirty(true);
        }
      }
    } catch (error: any) {
      toast.error(`Failed to select folder: ${error.message}`);
    }
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings({ ...settings, [key]: value });
    setIsDirty(true);
  };

  // Token management functions
  const handleAddToken = async () => {
    if (!newTokenName.trim() || !newTokenValue.trim()) {
      toast.error("Please enter both name and token");
      return;
    }

    try {
      const updatedTokens = await window.api.invoke("tokens:add", {
        name: newTokenName.trim(),
        token: newTokenValue.trim()
      }) as GoLoginToken[];
      setTokens(updatedTokens);
      setNewTokenName("");
      setNewTokenValue("");
      toast.success("Token added successfully!");
    } catch (error: any) {
      toast.error(`Failed to add token: ${error.message}`);
    }
  };

  const handleDeleteToken = async (index: number) => {
    try {
      const updatedTokens = await window.api.invoke("tokens:delete", index) as GoLoginToken[];
      setTokens(updatedTokens);
      toast.success("Token deleted successfully!");
    } catch (error: any) {
      toast.error(`Failed to delete token: ${error.message}`);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditName(tokens[index].name);
    setEditToken(tokens[index].token);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditName("");
    setEditToken("");
  };

  const handleUpdateToken = async () => {
    if (editingIndex === null) return;
    
    if (!editName.trim() || !editToken.trim()) {
      toast.error("Please enter both name and token");
      return;
    }

    try {
      const updatedTokens = await window.api.invoke("tokens:update", {
        index: editingIndex,
        name: editName.trim(),
        token: editToken.trim()
      }) as GoLoginToken[];
      setTokens(updatedTokens);
      cancelEditing();
      toast.success("Token updated successfully!");
    } catch (error: any) {
      toast.error(`Failed to update token: ${error.message}`);
    }
  };

  const maskToken = (token: string) => {
    if (token.length <= 20) return "••••••••••••••••";
    return token.substring(0, 10) + "••••••••" + token.substring(token.length - 10);
  };

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HardDrive className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure storage, tokens, and backup settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* GoLogin Tokens Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              GoLogin API Tokens
            </CardTitle>
            <CardDescription>
              Manage your GoLogin API tokens. Tokens are used for profile creation and management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new token */}
            <div className="flex gap-2">
              <Input
                placeholder="Token name (e.g., Account 1)"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="w-40"
              />
              <Input
                placeholder="Paste GoLogin API token here..."
                value={newTokenValue}
                onChange={(e) => setNewTokenValue(e.target.value)}
                className="flex-1"
                type="password"
              />
              <Button onClick={handleAddToken} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Token list */}
            <div className="space-y-2">
              {tokens.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No tokens configured. Add a token to start creating profiles.
                </div>
              ) : (
                tokens.map((token, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    {editingIndex === index ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-32"
                        />
                        <Input
                          value={editToken}
                          onChange={(e) => setEditToken(e.target.value)}
                          className="flex-1"
                          type="password"
                        />
                        <Button size="icon" variant="ghost" onClick={handleUpdateToken}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEditing}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium w-32 truncate">{token.name}</span>
                        <code className="flex-1 text-xs text-muted-foreground font-mono">
                          {maskToken(token.token)}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(index)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteToken(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              Get your API token from{" "}
              <a
                href="https://app.gologin.com/personalArea/TokenApi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GoLogin Dashboard → API Token
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Data Directory Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Data Directory
            </CardTitle>
            <CardDescription>
              Set where your profiles and application data are stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataPath">Data Path</Label>
              <div className="flex gap-2">
                <Input
                  id="dataPath"
                  value={settings.dataPath}
                  placeholder="Select data directory..."
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleDataPathSelect}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                This directory will contain all your profile data, settings, and cookies.
              </div>
            </div>
            
            {/* Database Test Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Kiểm Tra Database</h4>
                  <p className="text-sm text-muted-foreground">
                    Kiểm tra kết nối và trạng thái database SQLite
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const dbResult = await window.api.invoke("database:test") as any;
                      if (dbResult.success) {
                        toast.success(`✅ Database kết nối thành công!\n📁 Path: ${dbResult.dbPath}\n📊 Tables: ${dbResult.tables.join(', ')}\n👥 Profiles: ${dbResult.profileCount} | Groups: ${dbResult.groupCount}`);
                      } else {
                        toast.error(`❌ Database lỗi: ${dbResult.error}`);
                      }
                    } catch (error: any) {
                      toast.error(`❌ Lỗi kiểm tra database: ${error.message}`);
                    }
                  }}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Test Database
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup Settings
            </CardTitle>
            <CardDescription>
              Configure automatic backups of your profile data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backupEnabled">Enable Automatic Backups</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically backup your profile data
                </div>
              </div>
              <Switch
                id="backupEnabled"
                checked={settings.backupEnabled}
                onCheckedChange={(checked) => handleSettingChange("backupEnabled", checked)}
              />
            </div>

            {settings.backupEnabled && (
              <div className="space-y-2">
                <Label htmlFor="backupInterval">Backup Interval (hours)</Label>
                <Input
                  id="backupInterval"
                  type="number"
                  value={settings.backupInterval}
                  onChange={(e) => handleSettingChange("backupInterval", parseInt(e.target.value))}
                  min="1"
                  max="168"
                />
                <div className="text-sm text-muted-foreground">
                  How often to create automatic backups (1-168 hours)
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
