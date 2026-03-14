const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { getMenuText } = require('./menu');
const { createBooking, cancelBooking } = require('./booking');
const { saveUnansweredQuestion } = require('./unanswered');
const moment = require('moment-timezone');
const { loadConfig } = require('./config');
const http = require('http');

let client;

function initWhatsApp() {
  const config = loadConfig();
  if (!config) {
    console.error('Config not loaded. Cannot start WhatsApp.');
    return;
  }

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });

  client.on('qr', (qr) => {
    console.log('Scan the QR Code below to authenticate:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp Bot is ready and listening!');
  });

  function queryChatbot(question) {
    return new Promise((resolve, reject) => {
      const chatbotUrl = process.env.CHATBOT_URL || 'http://localhost:8000';
      const url = new URL('/query', chatbotUrl);
      const postData = `question=${encodeURIComponent(question)}`;
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject).end(postData);
    });
  }

  client.on('message', async (msg) => {
    const text = msg.body.trim();
    const phone = msg.from;

    if (text.toLowerCase() === 'menu') {
      const menuResponse = getMenuText();
      await client.sendMessage(msg.from, menuResponse);
      return;
    }

    if (text.toLowerCase().startsWith('cancel ')) {
      const parts = text.split(' ');
      if (parts.length === 2) {
        const id = parts[1];
        const res = await cancelBooking(phone, id);
        await client.sendMessage(msg.from, res.message);
        return;
      }
    }

    const bookRegex = /^book\s+(\d+)\s+on\s+(\S+)\s+at\s+(\S+)$/i;
    const match = text.match(bookRegex);
    if (match) {
      const partySize = parseInt(match[1], 10);
      const date = match[2];
      const time = match[3];

      if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
        await client.sendMessage(msg.from, 'Invalid date format. Please use YYYY-MM-DD (e.g., 2026-04-15).');
        return;
      }
      if (!moment(time, 'HH:mm', true).isValid()) {
        await client.sendMessage(msg.from, 'Invalid time format. Please use HH:mm (e.g., 18:30).');
        return;
      }

      const res = await createBooking(phone, partySize, date, time);
      await client.sendMessage(msg.from, res.message);
      return;
    }

    try {
      const data = await queryChatbot(text);
      const answerText = data.answer || '';
      
      const noInfoPatterns = [
        "I don't know",
        "I don't have",
        'No relevant information found',
        'could not find an answer',
        'not sure',
        'unable to find',
        'no information',
        'cannot find'
      ];
      
      let isUnknown = false;
      for (const pattern of noInfoPatterns) {
        if (answerText.toLowerCase().includes(pattern.toLowerCase())) {
          isUnknown = true;
          console.log(`[WhatsApp] Unknown: ${pattern}`);
          break;
        }
      }
      
      if (isUnknown || !answerText) {
        await saveUnansweredQuestion(phone, text);
        const politeMessage = 'Thank you for your question! 😊\n\nLet me check this and I will get back to you soon. Our team will review your question and respond as soon as possible.\n\nYou can also call us at +1234567890 for immediate assistance.';
        await client.sendMessage(msg.from, politeMessage);
      } else {
        await client.sendMessage(msg.from, answerText);
      }
    } catch (err) {
      console.error('Error:', err);
      await client.sendMessage(msg.from, 'Chatbot is currently unavailable. Please try again later.');
    }
  });

  client.initialize();
}

module.exports = {
  initWhatsApp
};