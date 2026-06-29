import { useState, useEffect } from "react";
import { fetchNotifications } from "../api/notifications";
import { Log } from "../api/logger";

export function useNotifications(page = 1, limit = 10, filterType = "All") {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [paginatedNotifications, setPaginatedNotifications] = useState([]);
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("viewed_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load from API
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await Log("frontend", "info", "hooks", "Triggering notifications refresh.");
      const data = await fetchNotifications();
      const allList = data.notifications || [];
      
      // Sort initially by recency (Timestamp descending)
      allList.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
      
      setNotifications(allList);
      await Log("frontend", "info", "hooks", `Successfully loaded ${allList.length} items to state.`);
    } catch (err) {
      // API failed (e.g. 401 or CORS), enter simulation fallback mode
      setError(`API connection issue (${err.message}). Loaded simulation mode.`);
      await Log("frontend", "warn", "hooks", `API failed. Loading mock fallback: ${err.message}`);
      
      const mockList = getMockNotifications();
      // Sort initially by recency (Timestamp descending)
      mockList.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
      setNotifications(mockList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Recalculate filtering and pagination locally for maximum stability
  useEffect(() => {
    let result = [...notifications];

    // Filter by type if not "All"
    if (filterType && filterType !== "All") {
      result = result.filter(
        (n) => (n.Type || "").toLowerCase() === filterType.toLowerCase()
      );
    }

    setFilteredNotifications(result);

    const itemsLimit = parseInt(limit) || 10;
    const currentPage = parseInt(page) || 1;
    const totalItems = result.length;
    const pages = Math.max(1, Math.ceil(totalItems / itemsLimit));
    setTotalPages(pages);

    const startIndex = (currentPage - 1) * itemsLimit;
    const endIndex = startIndex + itemsLimit;
    setPaginatedNotifications(result.slice(startIndex, endIndex));

  }, [notifications, page, limit, filterType]);

  // Sync viewedIds to localStorage
  useEffect(() => {
    localStorage.setItem("viewed_notifications", JSON.stringify(viewedIds));
  }, [viewedIds]);

  // Actions
  const markAsViewed = async (id) => {
    if (!viewedIds.includes(id)) {
      setViewedIds((prev) => [...prev, id]);
      await Log("frontend", "info", "hooks", `Marked notification ${id} as viewed.`);
    }
  };

  const markAllAsViewed = async () => {
    const unreadIds = notifications
      .map((n) => n.ID)
      .filter((id) => !viewedIds.includes(id));

    if (unreadIds.length > 0) {
      setViewedIds((prev) => [...prev, ...unreadIds]);
      await Log(
        "frontend",
        "info",
        "hooks",
        `Bulk marked ${unreadIds.length} notifications as viewed.`
      );
    }
  };

  const unreadCount = notifications.filter((n) => !viewedIds.includes(n.ID)).length;

  return {
    rawNotifications: notifications,
    notifications: paginatedNotifications,
    totalItems: filteredNotifications.length,
    totalPages,
    loading,
    error,
    viewedIds,
    unreadCount,
    markAsViewed,
    markAllAsViewed,
    refresh
  };
}

/**
 * Returns realistic mock data matching the exact JSON schema from the Affordmed API,
 * including case variations like "placement" and "Placement".
 */
function getMockNotifications() {
  return [
    {
      "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "Type": "Result",
      "Message": "mid-sem results published",
      "Timestamp": "2026-04-22 17:51:30"
    },
    {
      "ID": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
      "Type": "Placement",
      "Message": "CSX Corporation hiring drive open",
      "Timestamp": "2026-04-22 17:51:18"
    },
    {
      "ID": "81589ada-0ad3-4f77-9554-f52fb558e09d",
      "Type": "Event",
      "Message": "farewell registration starts today",
      "Timestamp": "2026-04-22 17:51:06"
    },
    {
      "ID": "0005513a-142b-4bbc-8678-eefec65e1ede",
      "Type": "Result",
      "Message": "mid-sem exam marks are out",
      "Timestamp": "2026-04-22 17:50:54"
    },
    {
      "ID": "e5c4ff20-31bf-4d40-8f02-72fda59e8918",
      "Type": "Result",
      "Message": "project-review criteria released",
      "Timestamp": "2026-04-22 17:50:18"
    },
    {
      "ID": "1cfce5ee-ad37-4894-8946-d707627176a5",
      "Type": "Event",
      "Message": "tech-fest core committee registrations",
      "Timestamp": "2026-04-22 17:50:06"
    },
    {
      "ID": "cf2885a6-45ac-4ba0-b548-6e9e9d4c52c8",
      "Type": "Result",
      "Message": "project-review results updated",
      "Timestamp": "2026-04-22 17:49:54"
    },
    {
      "ID": "8a7412bd-6065-4d09-8501-a37f11cc848b",
      "Type": "placement",
      "Message": "Advanced Micro Devices Inc. hiring",
      "Timestamp": "2026-04-22 17:49:42"
    },
    {
      "ID": "f9b8c7d6-e5f4-3a2b-1c0d-e9a8b7c6d5e4",
      "Type": "Placement",
      "Message": "Microsoft software engineering drive",
      "Timestamp": "2026-04-22 18:00:00"
    },
    {
      "ID": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "Type": "Event",
      "Message": "hackathon orientation starts at 4 PM",
      "Timestamp": "2026-04-22 17:45:00"
    },
    {
      "ID": "9a8b7c6d-5e4f-3a2b-1c0d-e9a8b7c6d5e4",
      "Type": "Result",
      "Message": "final sem SGPA release and review",
      "Timestamp": "2026-04-22 17:55:00"
    }
  ];
}
