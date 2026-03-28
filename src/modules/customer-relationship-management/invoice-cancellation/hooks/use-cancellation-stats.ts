import { useEffect, useState } from "react";

export function useCancellationStats() {
  const [pendingCount, setPendingCount] = useState(0);

  const fetchStats = async () => {
    try {
      // Call your local Next.js API instead of Directus directly
      const response = await fetch("/api/crm/invoice-cancellation-approval");
      const result = await response.json();

      // Update with the 'count' property we added to the API
      setPendingCount(result.count ?? 0);
    } catch (error) {
      console.error("Failed to fetch internal stats:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return { pendingCount };
}
