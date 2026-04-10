import { useState, useEffect, useCallback } from 'react';

// Custom event name for force refreshing the counts
export const SIDEBAR_COUNTS_UPDATE_EVENT = 'sidebar-counts-update';

export interface SidebarCounts {
  draft: number;
  approval: number;
  callsheet: number;
}

export function useSidebarCounts(pollingIntervalMs = 15000) {
  const [counts, setCounts] = useState<SidebarCounts>({ draft: 0, approval: 0, callsheet: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    try {
      // Use cache: 'no-store' or standard cache-busting
      const res = await fetch('/api/crm/sidebar-counts', {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setCounts({
          draft: data.draft || 0,
          approval: data.approval || 0,
          callsheet: data.callsheet || 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch sidebar counts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Set up polling
    const intervalId = setInterval(fetchCounts, pollingIntervalMs);

    // Set up event listener for manual triggers (realtime updates)
    const handleUpdateEvent = () => fetchCounts();
    window.addEventListener(SIDEBAR_COUNTS_UPDATE_EVENT, handleUpdateEvent);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener(SIDEBAR_COUNTS_UPDATE_EVENT, handleUpdateEvent);
    };
  }, [fetchCounts, pollingIntervalMs]);

  return { counts, isLoading, refetch: fetchCounts };
}
