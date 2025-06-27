"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sanitizeInput, sanitizePath, validateField, validationRules } from "@/lib/validation";
import {
  AlertCircle,
  CheckCircle,
  Database,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  HardDrive,
  Key,
  Lock,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Redefine interface here for simplicity
export interface Settings {
  dataPath: string;
  theme: "light" | "dark" | "system";
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  checkUpdates: boolean;
  logLevel: "error" | "warn" | "info" | "debug";
  maxProfiles: number;
  defaultProxy?: string;
  backupEnabled: boolean;
  backupInterval: number;
  gologinToken?: string;
}

// Credential type interface
interface SecureCredential {
  id: string;
  type: 'gologin_token' | 'proxy_password' | 'api_key' | 'other';
  name: string;
  createdAt: Date;
  lastUsed?: Date;
  metadata?: Record<string, any>;
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<Settings>({
    dataPath: "",
    theme: "system",
    language: "en",
    autoStart: false,
    minimizeToTray: true,
    checkUpdates: true,
    logLevel: "info",
    maxProfiles: 100,
    backupEnabled: false,
    backupInterval: 24,
    gologinToken: "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Credential management state
  const [credentials, setCredentials] = useState<SecureCredential[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isCredentialLoading, setIsCredentialLoading] = useState(false);
  const [newCredential, setNewCredential] = useState({
    id: '',
    type: 'other' as SecureCredential['type'],
    name: '',
    value: ''
  });
  const [encryptionStatus, setEncryptionStatus] = useState<{
    available: boolean;
    credentialCount: number;
    lastActivity?: Date;
  }>({ available: false, credentialCount: 0 });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const fetchedSettings = await window.api.invoke("settings:get");
        if (fetchedSettings) {
          setSettings(fetchedSettings);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
    loadCredentials();
    loadEncryptionStatus();
  }, []);

  // Credential Management Functions
  const loadCredentials = async () => {
    try {
      setIsCredentialLoading(true);
      const credList = await window.api.invoke("credentials:list");
      setCredentials(credList || []);
    } catch (error) {
      console.error("Failed to load credentials:", error);
      toast.error("Không thể tải danh sách thông tin đăng nhập");
    } finally {
      setIsCredentialLoading(false);
    }
  };

  const loadEncryptionStatus = async () => {
    try {
      const status = await window.api.invoke("credentials:status");
      setEncryptionStatus(status);
    } catch (error) {
      console.error("Failed to load encryption status:", error);
    }
  };

  const storeCredential = async () => {
    try {
      if (!newCredential.id || !newCredential.name || !newCredential.value) {
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      const result = await window.api.invoke("credentials:store", {
        id: newCredential.id,
        type: newCredential.type,
        name: newCredential.name,
        value: newCredential.value,
        metadata: {
          createdFrom: 'settings-ui',
          userAgent: navigator.userAgent
        }
      });

      if (result.success) {
        toast.success("Thông tin đăng nhập đã được lưu bảo mật");
        setNewCredential({ id: '', type: 'other', name: '', value: '' });
        await loadCredentials();
        await loadEncryptionStatus();
      } else {
        toast.error(`Lỗi lưu thông tin: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to store credential:", error);
      toast.error("Không thể lưu thông tin đăng nhập");
    }
  };

  const deleteCredential = async (credentialId: string) => {
    try {
      const result = await window.api.invoke("credentials:delete", credentialId);
      if (result.success) {
        toast.success("Đã xóa thông tin đăng nhập");
        await loadCredentials();
        await loadEncryptionStatus();
      } else {
        toast.error("Không thể xóa thông tin đăng nhập");
      }
    } catch (error) {
      console.error("Failed to delete credential:", error);
      toast.error("Lỗi khi xóa thông tin đăng nhập");
    }
  };

  const retrieveCredentialValue = async (credentialId: string) => {
    try {
      const value = await window.api.invoke("credentials:get", credentialId);
      return value;
    } catch (error) {
      console.error("Failed to retrieve credential:", error);
      toast.error("Không thể lấy giá trị thông tin đăng nhập");
      return null;
    }
  };

  const togglePasswordVisibility = async (credentialId: string) => {
    if (showPasswords[credentialId]) {
      // Hide password
      setShowPasswords(prev => ({ ...prev, [credentialId]: false }));
    } else {
      // Show password - retrieve from encrypted storage
      const value = await retrieveCredentialValue(credentialId);
      if (value) {
        setShowPasswords(prev => ({ ...prev, [credentialId]: value }));
      }
    }
  };

  const testEncryption = async () => {
    try {
      const result = await window.api.invoke("credentials:test");
      if (result.success) {
        toast.success("Hệ thống mã hóa hoạt động bình thường");
      } else {
        toast.error(`Lỗi hệ thống mã hóa: ${result.error}`);
      }
    } catch (error) {
      console.error("Encryption test failed:", error);
      toast.error("Không thể kiểm tra hệ thống mã hóa");
    }
  };

  const migrateGoLoginToken = async () => {
    try {
      if (!settings.gologinToken) {
        toast.error("Không có GoLogin token để chuyển đổi");
        return;
      }

      const result = await window.api.invoke("credentials:migrate-gologin", settings.gologinToken);
      if (result.success) {
        toast.success("GoLogin token đã được chuyển sang lưu trữ bảo mật");
        await loadCredentials();
        await loadEncryptionStatus();
      } else {
        toast.error(`Lỗi chuyển đổi: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to migrate GoLogin token:", error);
      toast.error("Không thể chuyển đổi GoLogin token");
    }
  };

  const handleSave = async () => {
    try {
      // Validate critical fields
      const errors: Record<string, string> = {};
      
      // Validate GoLogin token if provided
      if (settings.gologinToken) {
        const tokenValidation = validateField(settings.gologinToken, validationRules.gologinToken);
        if (!tokenValidation.isValid && tokenValidation.error) {
          errors.gologinToken = tokenValidation.error;
        }
      }

      // Validate data path if provided
      if (settings.dataPath) {
        const pathValidation = validateField(settings.dataPath, validationRules.filePath);
        if (!pathValidation.isValid && pathValidation.error) {
          errors.dataPath = pathValidation.error;
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        toast.error("Please correct the validation errors");
        return;
      }

      setFieldErrors({});
      
      // Sanitize inputs before saving
      const sanitizedSettings = {
        ...settings,
        dataPath: settings.dataPath ? sanitizePath(settings.dataPath) : "",
        gologinToken: settings.gologinToken ? sanitizeInput(settings.gologinToken) : "",
      };

      await window.api.invoke("settings:set", sanitizedSettings);
      setIsDirty(false);
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(`Failed to save settings: ${error.message}`);
    }
  };

  const handleDataPathSelect = async () => {
    try {
      const result = await window.api.invoke("dialog:selectFolder");
      if (result && !result.canceled && result.filePaths?.length > 0) {
        const newSettings = { ...settings, dataPath: result.filePaths[0] };
        setSettings(newSettings);
        setIsDirty(true);
      }
    } catch (error: any) {
      toast.error(`Failed to select folder: ${error.message}`);
    }
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings({ ...settings, [key]: value });
    setIsDirty(true);
    
    // Clear error for this field when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors({ ...fieldErrors, [key]: '' });
    }
  };

  const resetToDefaults = () => {
    const defaultSettings: Settings = {
      dataPath: "",
      theme: "system",
      language: "en",
      autoStart: false,
      minimizeToTray: true,
      checkUpdates: true,
      logLevel: "info",
      maxProfiles: 100,
      backupEnabled: false,
      backupInterval: 24,
      gologinToken: "",
    };
    setSettings(defaultSettings);
    setIsDirty(true);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your application preferences and system settings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={!isDirty}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <SettingsIcon className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="storage">
            <HardDrive className="mr-2 h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Database className="mr-2 h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => handleSettingChange("theme", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => handleSettingChange("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Application Behavior
              </CardTitle>
              <CardDescription>
                Control how the application behaves and interacts with your system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoStart">Auto Start</Label>
                  <div className="text-sm text-muted-foreground">
                    Start the application when your computer boots up
                  </div>
                </div>
                <Switch
                  id="autoStart"
                  checked={settings.autoStart}
                  onCheckedChange={(checked) => handleSettingChange("autoStart", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="minimizeToTray">Minimize to Tray</Label>
                  <div className="text-sm text-muted-foreground">
                    Keep the app running in the system tray when minimized
                  </div>
                </div>
                <Switch
                  id="minimizeToTray"
                  checked={settings.minimizeToTray}
                  onCheckedChange={(checked) => handleSettingChange("minimizeToTray", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="checkUpdates">Auto Check Updates</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically check for application updates
                  </div>
                </div>
                <Switch
                  id="checkUpdates"
                  checked={settings.checkUpdates}
                  onCheckedChange={(checked) => handleSettingChange("checkUpdates", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
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
                    className={`flex-1 ${fieldErrors.dataPath ? "border-red-500" : ""}`}
                  />
                  <Button variant="outline" onClick={handleDataPathSelect}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                {fieldErrors.dataPath && (
                  <p className="text-sm text-red-500">{fieldErrors.dataPath}</p>
                )}
                <div className="text-sm text-muted-foreground">
                  This directory will contain all your profile data, settings, and cookies.
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
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Profile Limits
              </CardTitle>
              <CardDescription>
                Control profile creation and usage limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxProfiles">Maximum Profiles</Label>
                <Input
                  id="maxProfiles"
                  type="number"
                  value={settings.maxProfiles}
                  onChange={(e) => handleSettingChange("maxProfiles", parseInt(e.target.value))}
                  min="1"
                  max="1000"
                />
                <div className="text-sm text-muted-foreground">
                  Maximum number of profiles that can be created (1-1000)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                GoLogin API Configuration
              </CardTitle>
              <CardDescription>
                Configure your GoLogin API access token for profile creation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gologinToken">GoLogin API Token</Label>
                <Input
                  id="gologinToken"
                  type="password"
                  value={settings.gologinToken || ""}
                  onChange={(e) => handleSettingChange("gologinToken", e.target.value)}
                  placeholder="Enter your GoLogin API token..."
                  className={fieldErrors.gologinToken ? "border-red-500" : ""}
                />
                {fieldErrors.gologinToken && (
                  <p className="text-sm text-red-500">{fieldErrors.gologinToken}</p>
                )}
                <div className="text-sm text-muted-foreground">
                  This token is required for creating and managing profiles. Get it from your GoLogin dashboard.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 🔐 CREDENTIAL MANAGEMENT SECTION */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Quản Lý Thông Tin Đăng Nhập Bảo Mật
                <Badge variant={encryptionStatus.available ? "default" : "secondary"}>
                  {encryptionStatus.available ? "Hoạt động" : "Không khả dụng"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Lưu trữ bảo mật các token API, mật khẩu proxy và thông tin đăng nhập quan trọng với mã hóa AES-256-GCM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Encryption Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {encryptionStatus.available ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">Trạng thái mã hóa</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {encryptionStatus.credentialCount} thông tin đã lưu
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={testEncryption}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Kiểm tra
                </Button>
              </div>

              {/* Migration Section */}
              {settings.gologinToken && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Chuyển đổi GoLogin Token
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Chuyển GoLogin token hiện tại sang lưu trữ mã hóa bảo mật
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={migrateGoLoginToken}>
                      <Lock className="h-4 w-4 mr-2" />
                      Chuyển đổi
                    </Button>
                  </div>
                </div>
              )}

              {/* Add New Credential */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Thêm Thông Tin Đăng Nhập Mới</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID (duy nhất)</Label>
                    <Input
                      placeholder="vd: my_proxy_auth"
                      value={newCredential.id}
                      onChange={(e) => setNewCredential({...newCredential, id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại thông tin</Label>
                    <Select
                      value={newCredential.type}
                      onValueChange={(value) => setNewCredential({...newCredential, type: value as SecureCredential['type']})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gologin_token">GoLogin Token</SelectItem>
                        <SelectItem value="proxy_password">Mật khẩu Proxy</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tên hiển thị</Label>
                    <Input
                      placeholder="vd: Proxy VPS Server 1"
                      value={newCredential.name}
                      onChange={(e) => setNewCredential({...newCredential, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giá trị bảo mật</Label>
                    <Input
                      type="password"
                      placeholder="Nhập token/mật khẩu..."
                      value={newCredential.value}
                      onChange={(e) => setNewCredential({...newCredential, value: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={storeCredential} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Lưu Bảo Mật
                </Button>
              </div>

              {/* Credentials List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Danh Sách Thông Tin Đăng Nhập ({credentials.length})</h4>
                  <Button variant="outline" size="sm" onClick={loadCredentials} disabled={isCredentialLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isCredentialLoading ? 'animate-spin' : ''}`} />
                    Tải lại
                  </Button>
                </div>
                
                {isCredentialLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Đang tải danh sách...
                  </div>
                ) : credentials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có thông tin đăng nhập nào được lưu trữ</p>
                    <p className="text-sm">Thêm thông tin đầu tiên ở form bên trên</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {credentials.map((credential) => (
                      <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{credential.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {credential.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>ID: {credential.id}</span>
                            <span>Tạo: {new Date(credential.createdAt).toLocaleDateString('vi-VN')}</span>
                            {credential.lastUsed && (
                              <span>Dùng: {new Date(credential.lastUsed).toLocaleDateString('vi-VN')}</span>
                            )}
                          </div>
                          {showPasswords[credential.id] && typeof showPasswords[credential.id] === 'string' && (
                            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                              {showPasswords[credential.id]}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePasswordVisibility(credential.id)}
                          >
                            {showPasswords[credential.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCredential(credential.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Info */}
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                <p>🔒 Tất cả thông tin được mã hóa bằng AES-256-GCM với khóa máy tính riêng biệt</p>
                <p>🛡️ Dữ liệu chỉ có thể giải mã trên máy tính này với tài khoản người dùng hiện tại</p>
                <p>📱 Hoàn toàn offline - không có dữ liệu nào được gửi qua internet</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Default Proxy
              </CardTitle>
              <CardDescription>
                Set a default proxy for new profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultProxy">Default Proxy</Label>
                <Select
                  value={settings.defaultProxy || "none"}
                  onValueChange={(value) => handleSettingChange("defaultProxy", value === "none" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Default Proxy</SelectItem>
                    {/* You can populate this with actual proxies */}
                    <SelectItem value="proxy1">Example Proxy 1</SelectItem>
                    <SelectItem value="proxy2">Example Proxy 2</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  New profiles will use this proxy by default
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Logging & Debugging
              </CardTitle>
              <CardDescription>
                Configure logging levels and debugging options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logLevel">Log Level</Label>
                <Select
                  value={settings.logLevel}
                  onValueChange={(value) => handleSettingChange("logLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select log level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="w-2 h-2 p-0"></Badge>
                        Error Only
                      </div>
                    </SelectItem>
                    <SelectItem value="warn">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-2 h-2 p-0 bg-yellow-500"></Badge>
                        Warnings & Errors
                      </div>
                    </SelectItem>
                    <SelectItem value="info">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-2 h-2 p-0 bg-blue-500"></Badge>
                        Info, Warnings & Errors
                      </div>
                    </SelectItem>
                    <SelectItem value="debug">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-2 h-2 p-0 bg-purple-500"></Badge>
                        Debug (Verbose)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  Higher levels include more detailed information but may impact performance
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-red-200 p-4 dark:border-red-800">
                <h4 className="font-medium text-red-900 dark:text-red-100">
                  Reset All Settings
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This will reset all settings to their default values. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={resetToDefaults}
                >
                  Reset All Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isDirty && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 