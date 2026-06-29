const axios = require('axios');
require('dotenv').config();

// Cache to prevent log loops on auth failures
let isTokenExpired = false;

/**
 * Sends backend logs to the Affordmed Log API.
 * 
 * @param {string} stack - 'backend' or 'frontend'
 * @param {string} level - 'debug', 'info', 'warn', 'error', 'fatal'
 * @param {string} pkg - The package name (e.g. 'route', 'controller', 'middleware')
 * @param {string} message - Log message details
 */
async function Log(stack, level, pkg, message) {
  if (isTokenExpired) {
    console.log(`[Local Log] [${level.toUpperCase()}] ${pkg}: ${message}`);
    return;
  }

  const url = 'http://4.224.186.213/evaluation-service/logs';
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    console.warn('[Logger Warning] ACCESS_TOKEN is missing in .env');
    return;
  }

  const payload = {
    stack: (stack || '').toLowerCase(),
    level: (level || '').toLowerCase(),
    package: (pkg || '').toLowerCase(),
    message
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 || response.status === 201) {
      console.log(`[Remote Log Success] [${level.toUpperCase()}] ${pkg}: ${message}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      isTokenExpired = true;
      console.warn('[Logger Warning] Authorization token expired/invalid. Muting remote logs.');
    }
    console.error(`[Remote Log Error] Failed: ${error.message}`);
  }
}

/**
 * Express middleware to log incoming requests.
 */
function loggerMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    Log('backend', level, 'middleware', message).catch(() => {});
  });
  
  next();
}

module.exports = { Log, loggerMiddleware };
