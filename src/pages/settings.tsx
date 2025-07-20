"use client";

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
    Database,
    FolderOpen,
    HardDrive,
    Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Simplified settings interface - only storage related
export interface Settings {
  dataPath: string;
  backupEnabled: boolean;
  backupInterval: number;
}

const SettingsPage = () => {
  // State for settings
  const [settings, setSettings] = useState<Settings>({
    dataPath: "",
    backupEnabled: false,
    backupInterval: 24,
  });

  // Form state
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const fetchedSettings = await window.api.invoke("settings:get") as any;
        if (fetchedSettings) {
          setSettings({
            dataPath: fetchedSettings.dataPath || "",
            backupEnabled: fetchedSettings.backupEnabled || false,
            backupInterval: fetchedSettings.backupInterval || 24,
          });
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Failed to load settings");
      }
    };

    fetchSettings();
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
        console.log(`Selected normalized path: ${selectedPath}`);
        
        // Setup database in the selected directory
        try {
          const dbSetupResult = await window.api.invoke("data:setupDatabase", selectedPath) as any;
          if (dbSetupResult.success) {
            // Use normalized path from backend if available, otherwise use selected path
            const finalPath = dbSetupResult.normalizedPath || selectedPath;
            const newSettings = { ...settings, dataPath: finalPath };
            setSettings(newSettings);
            setIsDirty(true);
            
            if (dbSetupResult.existed) {
              toast.success("Thư mục đã được chọn. Database hiện có sẽ được sử dụng.");
            } else {
              toast.success("Thư mục đã được chọn và database đã được sao chép thành công!");
            }
            
            // Log the path normalization if it occurred
            if (finalPath !== selectedPath) {
              console.log(`Path normalized from "${selectedPath}" to "${finalPath}"`);
            }
            
            // Auto-save settings and refresh to clear setup state
            setTimeout(async () => {
              try {
                await window.api.invoke("settings:set", newSettings);
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
          // Still set the path even if database setup failed
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

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HardDrive className="h-8 w-8" />
            Storage Settings
          </h1>
          <p className="text-muted-foreground">
            Configure data storage and backup settings.
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