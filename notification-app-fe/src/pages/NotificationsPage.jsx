import { useState, useEffect } from "react";
import {
  Alert,
  Badge,
  Box,
  CircularProgress,
  Divider,
  Pagination,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RefreshIcon from "@mui/icons-material/Refresh";

import { NotificationCard } from "../components/NotificationCard";
import { NotificationFilter } from "../components/NotificationFilter";
import { useNotifications } from "../hooks/useNotifications";
import { Log } from "../api/logger";

export function NotificationsPage() {
  // Read initial query parameters from URL
  const getQueryParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      page: parseInt(params.get("page")) || 1,
      limit: parseInt(params.get("limit")) || 10,
      type: params.get("notification_type") || "All"
    };
  };

  const initialParams = getQueryParams();
  const [filter, setFilter] = useState(initialParams.type);
  const [page, setPage] = useState(initialParams.page);
  const [limit, setLimit] = useState(initialParams.limit);

  // Sync state to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (limit !== 10) params.set("limit", limit.toString());
    if (filter !== "All") params.set("notification_type", filter);

    const queryStr = params.toString();
    const newUrl = queryStr ? `?${queryStr}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    
    Log("frontend", "info", "page", `URL sync: page=${page}, limit=${limit}, type=${filter}`);
  }, [page, limit, filter]);

  const {
    notifications,
    totalPages,
    loading,
    error,
    viewedIds,
    unreadCount,
    markAsViewed,
    markAllAsViewed,
    refresh
  } = useNotifications(page, limit, filter);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page on filter change
    Log("frontend", "info", "page", `Filter changed to ${newFilter}`);
  };

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
    Log("frontend", "info", "page", `Page navigated to ${newPage}`);
  };

  const handleLimitChange = (event) => {
    setLimit(event.target.value);
    setPage(1); // Reset to page 1
    Log("frontend", "info", "page", `Page limit changed to ${event.target.value}`);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon sx={{ fontSize: 28, color: "primary.main" }} />
          </Badge>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            General Inbox
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
            disabled={unreadCount === 0}
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
          <InputLabel id="limit-select-label">Show</InputLabel>
          <Select
            labelId="limit-select-label"
            id="limit-select"
            value={limit}
            label="Show"
            onChange={handleLimitChange}
          >
            <MenuItem value={5}>5 per page</MenuItem>
            <MenuItem value={10}>10 per page</MenuItem>
            <MenuItem value={15}>15 per page</MenuItem>
            <MenuItem value={20}>20 per page</MenuItem>
          </Select>
        </FormControl>
      </Stack>

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

      {!loading && notifications.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No notifications found matching your selection.
        </Alert>
      )}

      {!loading && notifications.length > 0 && (
        <Stack spacing={1.5}>
          {notifications.map((n) => (
            <NotificationCard
              key={n.ID}
              notification={n}
              isViewed={viewedIds.includes(n.ID)}
              onClick={() => markAsViewed(n.ID)}
            />
          ))}
        </Stack>
      )}

      {!loading && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
