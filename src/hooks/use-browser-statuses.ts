import { useEffect, useState } from "react";
import type { BrowserStatus } from "@/components/profiles/types";

export function useBrowserStatuses() {
  const [browserStatuses, setBrowserStatuses] = useState<Record<string, BrowserStatus>>({});

  useEffect(() => {
    const loadBrowserStatuses = async () => {
      try {
        const statuses = await window.api.invoke('profiles:getAllBrowserStatuses') as BrowserStatus[];
        const statusMap: Record<string, BrowserStatus> = {};
        statuses.forEach(status => {
          statusMap[status.profileId] = status;
        });
        setBrowserStatuses(statusMap);
      } catch (error) {
        console.error('Failed to load browser statuses:', error);
      }
    };

    loadBrowserStatuses();

    const handleStatusUpdate = (_event: unknown, data: { profileId: string; status: BrowserStatus }) => {
      setBrowserStatuses(prev => ({
        ...prev,
        [data.profileId]: data.status
      }));
    };

    window.api.on('browser-status-changed', handleStatusUpdate);

    return () => {
      window.api.removeListener('browser-status-changed', handleStatusUpdate);
    };
  }, []);

  return browserStatuses;
}
