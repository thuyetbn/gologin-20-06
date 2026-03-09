import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile } from "@/hooks/use-cached-data";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { type ProfileFormData, type Proxy, getCurrentProxyId, parseJsonData } from "./types";
import type { NavigatorConfig, ParsedProfileData } from "./types";

interface ProfileDialogProps {
  open: boolean;
  currentProfile: Profile | null;
  groups: { Id: number | null; Name: string }[];
  proxies: Proxy[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (profileData: ProfileFormData, currentProfile: Profile | null, closeDialog: () => void) => void;
}

export function ProfileDialog({
  open,
  currentProfile,
  groups,
  proxies,
  isSaving,
  onClose,
  onSave,
}: ProfileDialogProps) {
  const [profileOs, setProfileOs] = useState('win');
  const [profileOsSpec, setProfileOsSpec] = useState('');
  const [showNavigatorSettings, setShowNavigatorSettings] = useState(false);
  const [navUserAgent, setNavUserAgent] = useState('');
  const [navResolution, setNavResolution] = useState('1920x1080');
  const [navLanguage, setNavLanguage] = useState('vi-VN');
  const [navPlatform, setNavPlatform] = useState('Win32');
  const [navHardwareConcurrency, setNavHardwareConcurrency] = useState('8');
  const [navDeviceMemory, setNavDeviceMemory] = useState('8');
  const [navMaxTouchPoints, setNavMaxTouchPoints] = useState('0');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOsChange = (os: string) => {
    setProfileOs(os);
    setProfileOsSpec('');
    const osDefaults: Record<string, { platform: string; touch: string }> = {
      win: { platform: 'Win32', touch: '0' },
      mac: { platform: 'MacIntel', touch: '0' },
      lin: { platform: 'Linux x86_64', touch: '0' },
      android: { platform: 'Linux armv8l', touch: '5' },
    };
    const defaults = osDefaults[os] || osDefaults.win;
    setNavPlatform(defaults.platform);
    setNavMaxTouchPoints(defaults.touch);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = {
      name: formData.get("name") as string,
      group: formData.get("group") as string,
      proxy: formData.get("proxy") as string,
    };

    setFormErrors({});
    const groupIdValue = rawData.group;
    const proxyIdValue = rawData.proxy;

    const profileData: ProfileFormData = {
      Name: rawData.name.trim(),
      GroupId: groupIdValue === "none" ? null : Number(groupIdValue),
    };

    let jsonData: ParsedProfileData = {};
    if (currentProfile?.JsonData) {
      jsonData = parseJsonData(currentProfile.JsonData);
    }

    if (proxyIdValue === "none") {
      jsonData.proxyEnabled = false;
      jsonData.proxy = { mode: 'none', host: '', port: 80, username: '', password: '' };
    } else {
      const selectedProxy = proxies.find(p => String(p.id) === proxyIdValue);
      if (selectedProxy) {
        jsonData.proxyEnabled = true;
        jsonData.proxy = {
          mode: selectedProxy.type || 'none',
          host: selectedProxy.host,
          port: selectedProxy.port || 80,
          username: selectedProxy.username || '',
          password: selectedProxy.password || ''
        };
      }
    }

    if (!currentProfile) {
      profileData.os = profileOs;
      if (profileOsSpec.trim()) profileData.osSpec = profileOsSpec;
      const nav: NavigatorConfig = {};
      if (navUserAgent.trim()) nav.userAgent = navUserAgent.trim();
      if (navResolution) nav.resolution = navResolution;
      if (navLanguage.trim()) nav.language = navLanguage.trim();
      if (navPlatform.trim()) nav.platform = navPlatform.trim();
      if (navHardwareConcurrency) nav.hardwareConcurrency = Number(navHardwareConcurrency);
      if (navDeviceMemory) nav.deviceMemory = Number(navDeviceMemory);
      nav.maxTouchPoints = Number(navMaxTouchPoints);
      if (Object.keys(nav).length > 0) profileData.navigator = nav;
    }

    const finalProfileData = { ...profileData, JsonData: JSON.stringify(jsonData) };
    onSave(finalProfileData, currentProfile, onClose);
  };

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    } else {
      setProfileOs('win');
      setProfileOsSpec('');
      setShowNavigatorSettings(false);
      setNavUserAgent('');
      setNavResolution('1920x1080');
      setNavLanguage('vi-VN');
      setNavPlatform('Win32');
      setNavHardwareConcurrency('8');
      setNavDeviceMemory('8');
      setNavMaxTouchPoints('0');
      setFormErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto" onEscapeKeyDown={onClose}>
        <form onSubmit={handleSubmit} key={currentProfile?.Id || 'new'}>
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
              {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
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
                    <SelectItem key={g.Id} value={String(g.Id)}>{g.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proxy">Proxy (Tùy chọn)</Label>
              <Select name="proxy" defaultValue={getCurrentProxyId(currentProfile, proxies)}>
                <SelectTrigger id="proxy">
                  <SelectValue placeholder="Chọn proxy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không proxy</SelectItem>
                  {proxies.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.host}:{p.port}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* OS & Navigator Settings - only for new profiles */}
            {!currentProfile && (
              <>
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="os">Hệ điều hành</Label>
                      <Select value={profileOs} onValueChange={handleOsChange}>
                        <SelectTrigger id="os"><SelectValue placeholder="Chọn OS" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="win">Windows</SelectItem>
                          <SelectItem value="mac">macOS</SelectItem>
                          <SelectItem value="lin">Linux</SelectItem>
                          <SelectItem value="android">Android</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="osSpec">Phiên bản OS</Label>
                      <Select value={profileOsSpec} onValueChange={setProfileOsSpec}>
                        <SelectTrigger id="osSpec"><SelectValue placeholder="Mặc định" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">Mặc định</SelectItem>
                          {profileOs === 'win' && <SelectItem value="win11">Windows 11</SelectItem>}
                          {profileOs === 'mac' && (
                            <>
                              <SelectItem value="M1">Apple M1</SelectItem>
                              <SelectItem value="M2">Apple M2</SelectItem>
                              <SelectItem value="M3">Apple M3</SelectItem>
                              <SelectItem value="M4">Apple M4</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Collapsible Navigator Settings */}
                <div className="border rounded-lg">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full p-3 text-sm font-medium text-left hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => setShowNavigatorSettings(!showNavigatorSettings)}
                  >
                    <span>Cấu hình Navigator nâng cao</span>
                    {showNavigatorSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showNavigatorSettings && (
                    <div className="p-3 pt-0 space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="userAgent" className="text-xs">User Agent</Label>
                        <Input
                          id="userAgent"
                          value={navUserAgent}
                          onChange={(e) => setNavUserAgent(e.target.value)}
                          placeholder="Để trống để tự động tạo"
                          className="text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="resolution" className="text-xs">Độ phân giải</Label>
                          <Select value={navResolution} onValueChange={setNavResolution}>
                            <SelectTrigger id="resolution" className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1920x1080">1920x1080</SelectItem>
                              <SelectItem value="1536x864">1536x864</SelectItem>
                              <SelectItem value="1440x900">1440x900</SelectItem>
                              <SelectItem value="1366x768">1366x768</SelectItem>
                              <SelectItem value="1280x720">1280x720</SelectItem>
                              <SelectItem value="2560x1440">2560x1440</SelectItem>
                              <SelectItem value="3840x2160">3840x2160</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="language" className="text-xs">Ngôn ngữ</Label>
                          <Select value={navLanguage} onValueChange={setNavLanguage}>
                            <SelectTrigger id="language" className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vi-VN">vi-VN</SelectItem>
                              <SelectItem value="en-US">en-US</SelectItem>
                              <SelectItem value="en-GB">en-GB</SelectItem>
                              <SelectItem value="ja-JP">ja-JP</SelectItem>
                              <SelectItem value="ko-KR">ko-KR</SelectItem>
                              <SelectItem value="zh-CN">zh-CN</SelectItem>
                              <SelectItem value="fr-FR">fr-FR</SelectItem>
                              <SelectItem value="de-DE">de-DE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="platform" className="text-xs">Platform</Label>
                        <Input id="platform" value={navPlatform} onChange={(e) => setNavPlatform(e.target.value)} className="text-xs" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="cores" className="text-xs">CPU Cores</Label>
                          <Select value={navHardwareConcurrency} onValueChange={setNavHardwareConcurrency}>
                            <SelectTrigger id="cores" className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['2', '4', '8', '12', '16'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="memory" className="text-xs">RAM (GB)</Label>
                          <Select value={navDeviceMemory} onValueChange={setNavDeviceMemory}>
                            <SelectTrigger id="memory" className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['2', '4', '8', '16'].map(v => <SelectItem key={v} value={v}>{v} GB</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="touch" className="text-xs">Touch Points</Label>
                          <Select value={navMaxTouchPoints} onValueChange={setNavMaxTouchPoints}>
                            <SelectTrigger id="touch" className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['0', '1', '5', '10'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Hủy</Button>
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
  );
}
