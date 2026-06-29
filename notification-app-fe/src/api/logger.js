// Cache to prevent infinite loops of 401 log requests
let isTokenExpired = false;

/**
 * Sends frontend logs to the Affordmed Log API.
 * 
 * @param {string} stack - The stack name (e.g., 'frontend')
 * @param {string} level - The severity level (e.g., 'info', 'error')
 * @param {string} pkg - The package or component name (e.g., 'api', 'component')
 * @param {string} message - The log message details
 */
export async function Log(stack, level, pkg, message) {
  if (isTokenExpired) {
    console.log(`[Local Log] [${level.toUpperCase()}] ${pkg}: ${message}`);
    return;
  }

  const url = '/api-proxy/evaluation-service/logs';
  const token = import.meta.env.VITE_ACCESS_TOKEN;

  if (!token) {
    console.warn('[Logger Warning] VITE_ACCESS_TOKEN is missing in the environment variables.');
    return;
  }

  const payload = {
    stack: (stack || '').toLowerCase(),
    level: (level || '').toLowerCase(),
    package: (pkg || '').toLowerCase(),
    message
  };


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`[Remote Log Success] [${level.toUpperCase()}] ${pkg}: ${message}`);
    } else {
      if (response.status === 401) {
        isTokenExpired = true;
        console.warn('[Logger Warning] Authorization token invalid/expired. Muting remote logs to prevent network spam.');
      }
      const errData = await response.json().catch(() => ({}));
      console.error(`[Remote Log Failed] Status ${response.status}:`, errData);
    }
  } catch (error) {
    console.error(`[Remote Log Error] Failed to send log: ${error.message}`);
  }
}
