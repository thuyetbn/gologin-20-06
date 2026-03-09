import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Profile } from "@/hooks/use-cached-data";
import type { BulkActionType, ProfileFormData, Proxy } from "@/components/profiles/types";
import { parseJsonData } from "@/components/profiles/types";

interface UseProfileActionsOptions {
  profiles: Profile[];
  proxies: Proxy[];
  groups: { Id: number | null; Name: string }[];
  refreshCache: () => Promise<void>;
  updateLocalProfile: (profile: Profile) => void;
  addLocalProfile: (profile: Profile) => void;
  removeLocalProfile: (profileId: string) => void;
}

export function useProfileActions({
  profiles,
  proxies,
  groups,
  refreshCache,
  updateLocalProfile,
  addLocalProfile,
  removeLocalProfile,
}: UseProfileActionsOptions) {
  const [launchingProfileId, setLaunchingProfileId] = useState<string | null>(null);
  const [stoppingProfileId, setStoppingProfileId] = useState<string | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const handleLaunch = useCallback(async (profileId: string) => {
    setLaunchingProfileId(profileId);
    try {
      await window.api.invoke('profiles:launch', profileId);
      toast.success("Profile đã được khởi động thành công!");
      await refreshCache();
    } catch (error: any) {
      toast.error(error.message || "Không thể khởi động profile");
    } finally {
      setLaunchingProfileId(null);
    }
  }, [refreshCache]);

  const handleStop = useCallback(async (profileId: string) => {
    setStoppingProfileId(profileId);
    try {
      await window.api.invoke('profiles:stop', profileId);
      toast.success("Profile đã được dừng thành công!");
      await refreshCache();
    } catch (error: any) {
      toast.error(error.message || "Không thể dừng profile");
    } finally {
      setStoppingProfileId(null);
    }
  }, [refreshCache]);

  const handleRestart = useCallback(async (profileId: string) => {
    try {
      await window.api.invoke('profiles:restartBrowser', profileId);
      toast.success("Profile đã được khởi động lại thành công!");
      await refreshCache();
    } catch (error: any) {
      toast.error(error.message || "Không thể khởi động lại profile");
    }
  }, [refreshCache]);

  const handleDelete = useCallback(async (profileId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa profile này? Hành động không thể hoàn tác.')) return;
    setDeletingProfileId(profileId);
    try {
      await window.api.invoke("profiles:delete", profileId);
      removeLocalProfile(profileId);
      toast.success("Xóa profile thành công!");
    } catch (error: any) {
      toast.error(error.message || "Không thể xóa profile");
      await refreshCache();
    } finally {
      setDeletingProfileId(null);
    }
  }, [removeLocalProfile, refreshCache]);

  const handleExportCookie = useCallback(async (profileId: string) => {
    try {
      const cookieData = await window.api.invoke("profiles:exportCookie", profileId);
      const blob = new Blob([cookieData as string], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cookies_${profileId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Xuất cookies thành công!");
    } catch (error: any) {
      toast.error(`Lỗi xuất cookies: ${error.message}`);
    }
  }, []);

  const handleImportCookie = useCallback((profileId: string) => {
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
          toast.success("Nhập cookies thành công!");
        } catch (error: any) {
          toast.error(`Lỗi nhập cookies: ${error.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleSave = useCallback(async (
    profileData: ProfileFormData,
    currentProfile: Profile | null,
    closeDialog: () => void
  ) => {
    setIsSaving(true);
    try {
      if (currentProfile) {
        const updateResult = await window.api.invoke("profiles:update", { ...currentProfile, ...profileData });
        if (updateResult === true) {
          updateLocalProfile({ ...currentProfile, ...profileData });
          toast.success("Profile đã được cập nhật thành công!");
          closeDialog();
        } else {
          toast.error("Lỗi khi cập nhật profile trên server");
        }
      } else {
        const profileId = await window.api.invoke("profiles:create", profileData);
        if (profileId) {
          const newProfile = { ...profileData, Id: profileId, CreatedAt: new Date().toISOString() };
          addLocalProfile(newProfile);
          toast.success("Profile đã được tạo thành công!");
          closeDialog();
        } else {
          toast.error("Lỗi khi tạo profile trên server");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lưu profile");
    } finally {
      setIsSaving(false);
    }
  }, [updateLocalProfile, addLocalProfile]);

  const handleSaveNotes = useCallback(async (
    profile: Profile,
    notesValue: string,
    closeDialog: () => void
  ) => {
    try {
      const jsonData = parseJsonData(profile.JsonData);
      jsonData.notes = (notesValue || '').trim();

      const updatedProfile = {
        ...profile,
        JsonData: JSON.stringify(jsonData)
      };

      const updateResult = await window.api.invoke("profiles:update", updatedProfile);
      if (updateResult === true) {
        updateLocalProfile(updatedProfile);
        toast.success("Ghi chú đã được cập nhật thành công!");
        closeDialog();
      } else {
        toast.error("Lỗi khi cập nhật ghi chú trên server");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi lưu ghi chú");
    }
  }, [updateLocalProfile]);

  // Bulk operations
  const executeBulkAction = useCallback(async (
    action: BulkActionType,
    selectedIds: string[],
    options: { groupId?: string; extensionData?: string; proxyId?: string; bookmarkData?: string; userAgent?: string }
  ) => {
    setIsProcessingBulk(true);
    try {
      switch (action) {
        case 'export':
          await bulkExportCookies(selectedIds);
          break;
        case 'group':
          await bulkUpdateJsonDataField(selectedIds, 'group', options.groupId);
          break;
        case 'extension':
          await bulkUpdateJsonDataField(selectedIds, 'extension', options.extensionData);
          break;
        case 'proxy':
          await bulkUpdateJsonDataField(selectedIds, 'proxy', options.proxyId);
          break;
        case 'delete':
          await bulkDelete(selectedIds);
          break;
        case 'bookmark':
          await bulkUpdateJsonDataField(selectedIds, 'bookmark', options.bookmarkData);
          break;
        case 'useragent':
          await bulkUpdateJsonDataField(selectedIds, 'useragent', options.userAgent);
          break;
      }
      await refreshCache();
    } catch (error: any) {
      toast.error(`Lỗi thực hiện thao tác: ${error.message}`);
    } finally {
      setIsProcessingBulk(false);
    }
  }, [profiles, proxies, groups, refreshCache]);

  async function bulkExportCookies(profileIds: string[]) {
    const allCookies: Record<string, unknown> = {};
    const results = await Promise.allSettled(
      profileIds.map(async (profileId) => {
        const cookieData = await window.api.invoke("profiles:exportCookie", profileId);
        return { profileId, data: JSON.parse(cookieData as string) };
      })
    );
    let errorCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allCookies[result.value.profileId] = result.value.data;
      } else {
        errorCount++;
      }
    }
    if (errorCount > 0) {
      toast.error(`Lỗi export ${errorCount}/${profileIds.length} profiles`);
    }
    const blob = new Blob([JSON.stringify(allCookies, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk_cookies_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã export cookies của ${Object.keys(allCookies).length}/${profileIds.length} profiles`);
  }

  async function bulkUpdateJsonDataField(
    profileIds: string[],
    field: string,
    value?: string
  ) {
    // Build all update payloads synchronously, then fire IPC calls in parallel
    const updateTasks: Promise<boolean>[] = [];

    for (const profileId of profileIds) {
      const profile = profiles.find(p => p.Id === profileId);
      if (!profile) continue;

      try {
        if (field === 'group') {
          const groupIdNumber = value === 'none' ? null : Number(value);
          updateTasks.push(
            window.api.invoke("profiles:update", { ...profile, GroupId: groupIdNumber })
              .then((r: any) => r === true)
          );
          continue;
        }

        const jsonData = parseJsonData(profile.JsonData);

        switch (field) {
          case 'extension': {
            jsonData.extensions = JSON.parse(value || '[]');
            break;
          }
          case 'proxy': {
            if (value === 'none') {
              jsonData.proxyEnabled = false;
              jsonData.proxy = undefined;
            } else {
              const proxy = proxies.find(p => String(p.id) === value);
              if (proxy) {
                jsonData.proxyEnabled = true;
                jsonData.proxy = {
                  mode: proxy.type,
                  host: proxy.host,
                  port: proxy.port,
                  username: proxy.username || '',
                  password: proxy.password || ''
                };
              }
            }
            break;
          }
          case 'bookmark': {
            jsonData.bookmarks = JSON.parse(value || '[]');
            break;
          }
          case 'useragent': {
            if (!jsonData.navigator) jsonData.navigator = {};
            (jsonData.navigator as any).userAgent = (value || '').trim();
            break;
          }
        }

        updateTasks.push(
          window.api.invoke("profiles:update", {
            ...profile,
            JsonData: JSON.stringify(jsonData)
          }).then((r: any) => r === true)
        );
      } catch (error: any) {
        toast.error(`Lỗi cập nhật profile ${profileId}: ${error.message}`);
      }
    }

    const results = await Promise.allSettled(updateTasks);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

    if (successCount > 0) {
      const labels: Record<string, string> = {
        group: 'nhóm', extension: 'extensions', proxy: 'proxy',
        bookmark: 'bookmarks', useragent: 'UserAgent'
      };
      toast.success(`Đã cập nhật ${labels[field]} cho ${successCount}/${profileIds.length} profiles`);
    }
  }

  async function bulkDelete(profileIds: string[]) {
    const results = await Promise.allSettled(
      profileIds.map((profileId) => window.api.invoke("profiles:delete", profileId))
    );
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.length - successCount;
    if (failCount > 0) {
      toast.error(`Lỗi xoá ${failCount}/${profileIds.length} profiles`);
    }
    if (successCount > 0) {
      toast.success(`Đã xoá ${successCount}/${profileIds.length} profiles`);
    }
  }

  return {
    launchingProfileId,
    stoppingProfileId,
    deletingProfileId,
    isSaving,
    isProcessingBulk,
    handleLaunch,
    handleStop,
    handleRestart,
    handleDelete,
    handleExportCookie,
    handleImportCookie,
    handleSave,
    handleSaveNotes,
    executeBulkAction,
  };
}
