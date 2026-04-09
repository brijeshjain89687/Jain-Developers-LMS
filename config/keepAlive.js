// config/keepAlive.js
// Pings /api/health every 13 min on Render free tier to prevent spin-down

const https = require('https');
const http  = require('http');

const startKeepAlive = () => {
  if (!process.env.RENDER) {
    console.log('ℹ️  Keep-alive disabled (not on Render)');
    return;
  }
  const serviceUrl = process.env.RENDER_EXTERNAL_URL;
  if (!serviceUrl) return;

  const pingUrl = `${serviceUrl}/api/health`;
  const ping = () => {
    const lib = pingUrl.startsWith('https') ? https : http;
    lib.get(pingUrl, (res) => {
      console.log(`💓 Keep-alive: ${res.statusCode} — ${new Date().toISOString()}`);
    }).on('error', () => {}).end();
  };

  setTimeout(() => {
    ping();
    setInterval(ping, 13 * 60 * 1000);
  }, 2 * 60 * 1000);

  console.log(`💓 Keep-alive active — pinging ${pingUrl} every 13 min`);
};

module.exports = startKeepAlive;
