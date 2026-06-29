import { useState, useEffect } from "react";
import {
  Alert,
  Badge,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";

import { NotificationCard } from "../components/NotificationCard";
import { NotificationFilter } from "../components/NotificationFilter";
import { useNotifications } from "../hooks/useNotifications";
import { Log } from "../api/logger";

// Category weight config
const TYPE_WEIGHTS = {
  'placement': 3,
  'result': 2,
  'event': 1
};

// Priority sorting function
function compareNotifications(a, b) {
  const typeA = (a.Type || '').toLowerCase();
  const typeB = (b.Type || '').toLowerCase();

  const weightA = TYPE_WEIGHTS[typeA] || 0;
  const weightB = TYPE_WEIGHTS[typeB] || 0;

  if (weightA !== weightB) {
    return weightB - weightA; // Higher weight first
  }

  // If weights are equal, sort by Timestamp (newest first)
  return new Date(b.Timestamp) - new Date(a.Timestamp);
}

export function PriorityInboxPage() {
  const [filter, setFilter] = useState("All");
  const [limitN, setLimitN] = useState(10); // Default Top 10

  // Fetch all raw notifications
  const {
    rawNotifications,
    loading,
    error,
    viewedIds,
    markAsViewed,
    markAllAsViewed,
    refresh
  } = useNotifications(1, 1000, "All"); // Fetch all raw items to sort locally

  // Sync state log
  useEffect(() => {
    Log("frontend", "info", "priority_page", `Priority view synced: limit=${limitN}, typeFilter=${filter}`);
  }, [limitN, filter]);

  // Compute Priority Notifications
  // 1. Get only UNREAD notifications
  const unreadNotifications = rawNotifications.filter(n => !viewedIds.includes(n.ID));
  
  // 2. Sort by weight and recency
  const sortedUnread = [...unreadNotifications].sort(compareNotifications);

  // 3. Filter by type if not "All"
  const filteredSorted = filter === "All" 
    ? sortedUnread 
    : sortedUnread.filter(n => (n.Type || '').toLowerCase() === filter.toLowerCase());

  // 4. Slice to Top N
  const topNNotifications = filteredSorted.slice(0, limitN);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    Log("frontend", "info", "priority_page", `Filter changed to ${newFilter}`);
  };

  const handleLimitChange = (event) => {
    setLimitN(event.target.value);
    Log("frontend", "info", "priority_page", `Limit N changed to ${event.target.value}`);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Badge badgeContent={unreadNotifications.length} color="error" max={99}>
            <StarIcon sx={{ fontSize: 28, color: "#eab308" }} />
          </Badge>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Priority Inbox
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DoneAllIcon />}
            onClick={markAllAsViewed}
            disabled={unreadNotifications.length === 0}
          >
            Mark all read
          </Button>
        </Stack>
      </Stack>

      <Stack 
        direction={{ xs: "column", sm: "row" }} 
        alignItems={{ xs: "flex-start", sm: "center" }} 
        justifyContent="space-between" 
        spacing={2} 
        mb={3}
      >
        <NotificationFilter value={filter} onChange={handleFilterChange} />
        
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="priority-limit-label">Limit (N)</InputLabel>
          <Select
            labelId="priority-limit-label"
            id="priority-limit-select"
            value={limitN}
            label="Limit (N)"
            onChange={handleLimitChange}
          >
            <MenuItem value={10}>Top 10</MenuItem>
            <MenuItem value={15}>Top 15</MenuItem>
            <MenuItem value={20}>Top 20</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Unread items are ranked by **Weight** (Placement &gt; Result &gt; Event) and **Recency**.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && topNNotifications.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No unread priority notifications found.
        </Alert>
      )}

      {!loading && topNNotifications.length > 0 && (
        <Stack spacing={1.5}>
          {topNNotifications.map((n) => (
            <NotificationCard
              key={n.ID}
              notification={n}
              isViewed={false} // Priority list only contains unread notifications
              onClick={() => markAsViewed(n.ID)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

