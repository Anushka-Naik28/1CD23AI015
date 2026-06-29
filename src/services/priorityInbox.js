const axios = require('axios');
require('dotenv').config();

// Weights for notification types (case-insensitive mapping)
const TYPE_WEIGHTS = {
  'placement': 3,
  'result': 2,
  'event': 1
};

/**
 * Comparator to sort/rank notifications.
 * Sorts by Type Weight descending (placement > result > event),
 * and secondary sorts by Timestamp descending (recency).
 * 
 * Expected properties from API: ID, Type, Message, Timestamp
 */
function compareNotifications(a, b) {
  const typeA = (a.Type || '').toLowerCase();
  const typeB = (b.Type || '').toLowerCase();

  const weightA = TYPE_WEIGHTS[typeA] || 0;
  const weightB = TYPE_WEIGHTS[typeB] || 0;

  if (weightA !== weightB) {
    return weightB - weightA; // Higher weight first
  }

  // If weights are equal, sort by Timestamp (newest first)
  const timeA = new Date(a.Timestamp);
  const timeB = new Date(b.Timestamp);
  return timeB - timeA;
}

/**
 * Finds the top 10 notifications using standard sort.
 * 
 * @param {Array} notifications - Array of notification objects
 * @returns {Array} - Top 10 sorted notifications
 */
function getTopTenNotifications(notifications) {
  return [...notifications]
    .sort(compareNotifications)
    .slice(0, 10);
}

/**
 * Fetches notifications from the Affordmed Notification API.
 */
async function fetchNotifications() {
  const url = 'http://4.224.186.213/evaluation-service/notifications';
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    throw new Error('ACCESS_TOKEN is missing in the environment variables.');
  }

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  return response.data.notifications || [];
}

// ==================== RUNNER ====================

async function run() {
  console.log('=== STAGE 6: FETCHING NOTIFICATIONS & RANKING PRIORITY INBOX ===\n');

  let notifications = [];
  let isFallback = false;

  try {
    console.log('Attempting to fetch notifications from live Affordmed API...');
    notifications = await fetchNotifications();
    console.log(`Successfully fetched ${notifications.length} notifications from live API.`);
  } catch (error) {
    console.warn('\n[Warning] Live API request failed.');
    if (error.response) {
      console.warn(`Reason (${error.response.status}):`, error.response.data);
    } else {
      console.warn('Reason:', error.message);
    }

    console.log('\n--> Entering Fallback Simulation Mode (using realistic mock data matching API schema)...');
    isFallback = true;
    notifications = getMockNotifications();
  }

  if (notifications.length === 0) {
    console.log('No notifications available to display.');
    return;
  }

  // Sort and select Top 10
  const top10 = getTopTenNotifications(notifications);

  console.log(`\n--- TOP 10 PRIORITY NOTIFICATIONS ${isFallback ? '(FALLBACK MOCK)' : '(LIVE API)'} ---`);
  console.table(
    top10.map((n, index) => ({
      Rank: index + 1,
      ID: n.ID,
      Type: n.Type,
      Message: n.Message,
      Timestamp: n.Timestamp
    }))
  );

  console.log('\n--- DYNAMIC STREAMING PERFORMANCE NOTE ---');
  console.log('To maintain the top 10 efficiently as new notifications arrive in real-time,');
  console.log('the application should use a Min-Heap of size K=10. This ensures that new');
  console.log('notifications are processed in O(log K) rather than sorting the entire list (O(N log N)).');
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
      "Message": "mid-sem",
      "Timestamp": "2026-04-22 17:51:30"
    },
    {
      "ID": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
      "Type": "Placement",
      "Message": "CSX Corporation hiring",
      "Timestamp": "2026-04-22 17:51:18"
    },
    {
      "ID": "81589ada-0ad3-4f77-9554-f52fb558e09d",
      "Type": "Event",
      "Message": "farewell",
      "Timestamp": "2026-04-22 17:51:06"
    },
    {
      "ID": "0005513a-142b-4bbc-8678-eefec65e1ede",
      "Type": "Result",
      "Message": "mid-sem",
      "Timestamp": "2026-04-22 17:50:54"
    },
    {
      "ID": "e5c4ff20-31bf-4d40-8f02-72fda59e8918",
      "Type": "Result",
      "Message": "project-review",
      "Timestamp": "2026-04-22 17:50:18"
    },
    {
      "ID": "1cfce5ee-ad37-4894-8946-d707627176a5",
      "Type": "Event",
      "Message": "tech-fest",
      "Timestamp": "2026-04-22 17:50:06"
    },
    {
      "ID": "cf2885a6-45ac-4ba0-b548-6e9e9d4c52c8",
      "Type": "Result",
      "Message": "project-review",
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
      "Message": "Microsoft hiring drive",
      "Timestamp": "2026-04-22 18:00:00"
    },
    {
      "ID": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "Type": "Event",
      "Message": "hackathon orientation",
      "Timestamp": "2026-04-22 17:45:00"
    },
    {
      "ID": "9a8b7c6d-5e4f-3a2b-1c0d-e9a8b7c6d5e4",
      "Type": "Result",
      "Message": "final sem SGPA release",
      "Timestamp": "2026-04-22 17:55:00"
    }
  ];
}

if (require.main === module) {
  run();
}

module.exports = { compareNotifications, getTopTenNotifications, fetchNotifications };
