import { useEffect, useState } from "react";

// Define types based on how they're used in the pages
export interface Profile {
  id: string;
  name: string;
  notes?: string;
  proxy?: string;
  groupId?: number;
  status?: "running" | "stopped" | "error";
  CreatedAt?: string;
  [key: string]: any;
}

export interface Group {
  id: number;
  name: string;
  color?: string;
  CreatedAt?: string;
  [key: string]: any;
}

export interface Proxy {
  id: string;
  name: string;
  type: "http" | "https" | "socks4" | "socks5";
  host: string;
  port: number;
  username?: string;
  password?: string;
  status?: "active" | "inactive" | "error";
  CreatedAt?: string;
}

export interface CachedData {
  profiles: Profile[];
  groups: Group[];
  proxies: Proxy[];
  isLoading: boolean;
  refreshCache: () => Promise<void>;
  updateLocalProfile: (profile: Profile) => void;
  addLocalProfile: (profile: Profile) => void;
  removeLocalProfile: (id: string) => void;
  updateLocalGroup: (group: Group) => void;
  addLocalGroup: (group: Group) => void;
  removeLocalGroup: (id: number) => void;
}

export const useCachedData = (): CachedData => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedProfiles, fetchedGroups, fetchedProxies] = await Promise.all([
        window.api.invoke("profiles:get").catch(() => []),
        window.api.invoke("groups:get").catch(() => []),
        window.api.invoke("proxies:get").catch(() => [])
      ]);

      setProfiles(Array.isArray(fetchedProfiles) ? fetchedProfiles : []);
      setGroups(Array.isArray(fetchedGroups) ? fetchedGroups : []);
      setProxies(Array.isArray(fetchedProxies) ? fetchedProxies : []);
    } catch (error) {
      console.error("Failed to fetch cached data:", error);
      setProfiles([]);
      setGroups([]);
      setProxies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCache = async () => {
    await fetchData();
  };

  // Profile local update functions
  const updateLocalProfile = (updatedProfile: Profile) => {
    setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };

  const addLocalProfile = (newProfile: Profile) => {
    setProfiles(prev => [...prev, newProfile]);
  };

  const removeLocalProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  // Group local update functions
  const updateLocalGroup = (updatedGroup: Group) => {
    setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  };

  const addLocalGroup = (newGroup: Group) => {
    setGroups(prev => [...prev, newGroup]);
  };

  const removeLocalGroup = (id: number) => {
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  return {
    profiles,
    groups,
    proxies,
    isLoading,
    refreshCache,
    updateLocalProfile,
    addLocalProfile,
    removeLocalProfile,
    updateLocalGroup,
    addLocalGroup,
    removeLocalGroup
  };
}; 