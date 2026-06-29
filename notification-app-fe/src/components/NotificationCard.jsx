import { Card, CardActionArea, Box, Typography, Stack } from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventIcon from "@mui/icons-material/Event";
import CircleIcon from "@mui/icons-material/Circle";

// Helper to get category styles
const getCategoryConfig = (type = "") => {
  const lowerType = type.toLowerCase();
  switch (lowerType) {
    case "placement":
      return {
        color: "#6366f1", // Indigo
        icon: <WorkIcon sx={{ color: "#6366f1" }} />,
        label: "Placement"
      };
    case "result":
      return {
        color: "#10b981", // Emerald
        icon: <CheckCircleIcon sx={{ color: "#10b981" }} />,
        label: "Result"
      };
    case "event":
    default:
      return {
        color: "#f59e0b", // Amber
        icon: <EventIcon sx={{ color: "#f59e0b" }} />,
        label: type || "Event"
      };
  }
};

export function NotificationCard({ notification, isViewed, onClick }) {
  const { Type, Message, Timestamp } = notification;
  const config = getCategoryConfig(Type);

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: isViewed ? "rgba(0, 0, 0, 0.08)" : "rgba(99, 102, 241, 0.2)",
        backgroundColor: isViewed ? "rgba(255, 255, 255, 0.6)" : "rgba(99, 102, 241, 0.03)",
        borderLeft: `5px solid ${config.color}`,
        borderRadius: 2,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: isViewed 
            ? "0 4px 12px rgba(0, 0, 0, 0.04)" 
            : "0 4px 16px rgba(99, 102, 241, 0.08)",
          borderColor: config.color,
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: isViewed ? "rgba(0, 0, 0, 0.03)" : "rgba(99, 102, 241, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {config.icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{
                  color: config.color,
                  textTransform: "uppercase",
                  letterSpacing: 0.8
                }}
              >
                {config.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(Timestamp).toLocaleString()}
              </Typography>
            </Stack>
            <Typography
              variant="body1"
              fontWeight={isViewed ? 400 : 600}
              color={isViewed ? "text.secondary" : "text.primary"}
            >
              {Message}
            </Typography>
          </Box>
          
          {/* Unread indicator */}
          {!isViewed && (
            <Box sx={{ alignSelf: "center", pl: 1 }}>
              <CircleIcon sx={{ fontSize: 10, color: config.color }} />
            </Box>
          )}
        </Stack>
      </CardActionArea>
    </Card>
  );
}
