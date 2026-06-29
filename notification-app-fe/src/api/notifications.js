import { Log } from "./logger";

/**
 * Fetches notifications from the protected Affordmed API.
 * 
 * @param {Object} params - Query parameters (limit, page, notification_type)
 */
export async function fetchNotifications(params = {}) {
  const baseUrl = '/api-proxy/evaluation-service/notifications';
  const token = import.meta.env.VITE_ACCESS_TOKEN;


  if (!token) {
    const errMsg = 'ACCESS_TOKEN is missing in the environment.';
    await Log('frontend', 'error', 'api', errMsg);
    throw new Error(errMsg);
  }

  // Construct URL with query parameters if supported/requested
  const url = new URL(baseUrl, window.location.origin);

  if (params.page) url.searchParams.append('page', params.page);
  if (params.limit) url.searchParams.append('limit', params.limit);
  if (params.notification_type && params.notification_type !== 'All') {
    url.searchParams.append('notification_type', params.notification_type);
  }

  await Log('frontend', 'info', 'api', `Initiated request to: ${url.pathname}${url.search}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      await Log('frontend', 'error', 'api', `API request failed (Status ${response.status}): ${errText}`);
      throw new Error(`Server returned status code ${response.status}`);
    }

    const data = await response.json();
    await Log('frontend', 'info', 'api', `Successfully retrieved ${data.notifications?.length || 0} notifications.`);
    return data;
  } catch (error) {
    await Log('frontend', 'error', 'api', `API Connection failed: ${error.message}`);
    throw error;
  }
}
