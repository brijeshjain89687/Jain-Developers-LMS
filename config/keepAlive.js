// config/keepAlive.js
// Pings /api/health every 13 min on Render free tier to prevent spin-down.
// Works on BOTH free and paid Render plans:
//   - Paid:  uses RENDER_EXTERNAL_URL env var
//   - Free:  falls back to self-ping via localhost:PORT

const https = require('https');
const http  = require('http');

const startKeepAlive = () => {
  if (!process.env.RENDER) {
    console.log('ℹ️  Keep-alive disabled (not on Render)');
    return;
  }

  // RENDER_EXTERNAL_URL is available on paid plans; fall back to localhost for free tier
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  const port        = process.env.PORT || 5000;
  const pingUrl     = externalUrl
    ? `${externalUrl}/api/health`
    : `http://localhost:${port}/api/health`;

  const ping = () => {
    const lib = pingUrl.startsWith('https') ? https : http;
    lib.get(pingUrl, (res) => {
      console.log(`💓 Keep-alive: ${res.statusCode} — ${new Date().toISOString()}`);
    }).on('error', (err) => {
      console.warn('💓 Keep-alive ping failed:', err.message);
    }).end();
  };

  // Wait 2 min after startup so the server is fully ready, then ping every 13 min
  setTimeout(() => {
    ping();
    setInterval(ping, 13 * 60 * 1000);
  }, 2 * 60 * 1000);

  console.log(`💓 Keep-alive active — pinging ${pingUrl} every 13 min`);
};

module.exports = startKeepAlive;
