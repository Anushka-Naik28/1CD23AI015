import { useState, useEffect } from "react";
import { 
  createTheme, 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  Container, 
  Paper, 
  Tab, 
  Tabs, 
  Typography, 
  Stack 
} from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import StarOutlineIcon from "@mui/icons-material/StarBorder";


import { NotificationsPage } from "./pages/NotificationsPage";
import { PriorityInboxPage } from "./pages/PriorityInboxPage";
import { Log } from "./api/logger";

// Define a premium, modern dark theme with Indigo & Violet accents
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1", // Vibrant Indigo
    },
    secondary: {
      main: "#a855f7", // Violet
    },
    background: {
      default: "#0b0f19", // Deep Slate Black
      paper: "rgba(17, 24, 39, 0.7)", // Glassy Paper
    },
    text: {
      primary: "#f3f4f6",
      secondary: "#9ca3af",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
    },
    h5: {
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          background-attachment: fixed;
          background-image: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
                            radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
        }
      `,
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        },
      },
    },
  },
});

export default function App() {
  const getInitialView = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") === "priority" ? 1 : 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialView);

  // Sync tab changes with URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab === 1) {
      params.set("view", "priority");
    } else {
      params.delete("view");
    }
    const queryStr = params.toString();
    const newUrl = queryStr ? `?${queryStr}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);

    const viewName = activeTab === 1 ? "Priority Inbox" : "General Inbox";
    Log("frontend", "info", "app", `View changed to ${viewName}`);
  }, [activeTab]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", py: { xs: 4, md: 8 } }}>
        <Container maxWidth="md">
          {/* Header Branding */}
          <Stack direction="row" alignItems="center" spacing={2} mb={4} justifyContent="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Typography variant="h5" fontWeight={900} color="#fff">A</Typography>
            </Box>
            <Typography variant="h4" sx={{ letterSpacing: -1, background: "linear-gradient(to right, #f3f4f6, #9ca3af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Affordmed Portal
            </Typography>
          </Stack>

          {/* Navigation and Content Container */}
          <Paper sx={{ borderRadius: 4, overflow: "hidden" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "rgba(0, 0, 0, 0.2)" }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
                aria-label="notification tabs"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab
                  icon={<MailOutlineIcon />}
                  iconPosition="start"
                  label="General Inbox"
                  sx={{ py: 2, textTransform: "none", fontWeight: 600 }}
                />
                <Tab
                  icon={<StarOutlineIcon />}
                  iconPosition="start"
                  label="Priority Inbox"
                  sx={{ py: 2, textTransform: "none", fontWeight: 600 }}
                />
              </Tabs>
            </Box>

            {/* Render selected view */}
            <Box sx={{ p: { xs: 2, sm: 4 } }}>
              {activeTab === 0 ? <NotificationsPage /> : <PriorityInboxPage />}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}