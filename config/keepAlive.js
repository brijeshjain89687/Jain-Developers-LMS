// config/keepAlive.js
const https = require('https');
const http  = require('http');
module.exports = () => {
  if (!process.env.RENDER || !process.env.RENDER_EXTERNAL_URL) return;
  const url = process.env.RENDER_EXTERNAL_URL + '/api/health';
  const ping = () => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, r => console.log('💓 keep-alive', r.statusCode)).on('error', () => {}).end();
  };
  setTimeout(() => { ping(); setInterval(ping, 13 * 60 * 1000); }, 2 * 60 * 1000);
  console.log('💓 keep-alive active');
};
