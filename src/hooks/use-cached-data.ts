import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import React from "react";

// Define types based on how they're used in the pages
export interface Profile {
  Id: string;
  Name: string;
  ProfilePath?: string;
  JsonData?: string;
  GroupId?: number | null;
  CreatedAt?: string;
  LastRunAt?: string;
  Group?: Group;
  Notes?: string;
  Proxy?: string;
  Status?: "running" | "stopped" | "error";
}

export interface Group {
  Id: number;
  Name: string;
  Description?: string;
  Color?: string;
  CreatedAt?: string;
  ProfileCount?: number;
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

const CachedDataContext = createContext<CachedData | null>(null);

export function CachedDataProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
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
  }, []);

  const refreshCache = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Profile local update functions
  const updateLocalProfile = useCallback((updatedProfile: Profile) => {
    setProfiles(prev => prev.map(p => p.Id === updatedProfile.Id ? updatedProfile : p));
  }, []);

  const addLocalProfile = useCallback((newProfile: Profile) => {
    setProfiles(prev => [...prev, newProfile]);
  }, []);

  const removeLocalProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.Id !== id));
  }, []);

  // Group local update functions
  const updateLocalGroup = useCallback((updatedGroup: Group) => {
    setGroups(prev => prev.map(g => g.Id === updatedGroup.Id ? updatedGroup : g));
  }, []);

  const addLocalGroup = useCallback((newGroup: Group) => {
    setGroups(prev => [...prev, newGroup]);
  }, []);

  const removeLocalGroup = useCallback((id: number) => {
    setGroups(prev => prev.filter(g => g.Id !== id));
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value: CachedData = {
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

  return React.createElement(CachedDataContext.Provider, { value }, children);
}

export const useCachedData = (): CachedData => {
  const context = useContext(CachedDataContext);
  if (!context) {
    throw new Error("useCachedData must be used within a CachedDataProvider");
  }
  return context;
};
