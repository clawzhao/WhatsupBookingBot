const axios = require('axios');
const { loadConfig } = require('./config');

const userSessions = {};

function getOpenWAConfig() {
  const config = loadConfig();
  const openwa = config?.restaurant?.messaging?.openwa || config?.messaging?.openwa || {};
  return {
    gatewayUrl: openwa.gatewayUrl || 'http://127.0.0.1:2785',
    apiKey: openwa.apiKey || 'dev-admin-key',
    sessionName: openwa.sessionName || 'main'
  };
}

async function sendMessage(phone, text) {
  const { gatewayUrl, apiKey, sessionName } = getOpenWAConfig();
  const digits = String(phone).replace(/\D/g, '');
  const chatId = `${digits}@c.us`;
  const url = `${gatewayUrl}/api/sessions/${sessionName}/messages/send-text`;
  try {
    await axios.post(url, { chatId, text }, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      timeout: 10000
    });
    return true;
  } catch (err) {
    console.error('[OpenWA] sendMessage failed:', err.message);
    return false;
  }
}

async function getOpenWAStatus() {
  const { gatewayUrl, sessionName } = getOpenWAConfig();
  const config = loadConfig();
  const channel = config?.restaurant?.messaging?.channel || config?.messaging?.channel || 'telegram';
  let reachable = false;
  try {
    await axios.get(`${gatewayUrl}/api/health`, { timeout: 3000 });
    reachable = true;
  } catch (_) {
    reachable = false;
  }
  return { enabled: channel === 'whatsapp', gatewayUrl, sessionName, reachable };
}

module.exports = { sendMessage, getOpenWAStatus, userSessions };
