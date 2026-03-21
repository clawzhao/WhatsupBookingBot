#!/usr/bin/env node
require('dotenv').config();
const { spawn } = require('child_process');

const BOT_CMD = 'node';
const BOT_ARGS = ['src/index.js'];

function start() {
  const env = {
    ...process.env,
    CHATBOT_URL: process.env.CHATBOT_URL || 'http://localhost:8000',
    WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED || 'false',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
  };

  console.log('[Watchdog] Starting bot...');
  const child = spawn(BOT_CMD, BOT_ARGS, {
    stdio: 'inherit',
    env,
    cwd: __dirname,
    detached: false
  });

  child.on('exit', (code, signal) => {
    console.log(`[Watchdog] Bot exited (code=${code}, signal=${signal}). Restarting in 2s...`);
    setTimeout(start, 2000);
  });

  child.on('error', (err) => {
    console.error('[Watchdog] Start error:', err.message);
    setTimeout(start, 2000);
  });
}

start();
