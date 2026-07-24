// Fetch application commands registered by bot ID 1528908590822199497
const https = require('https');
const fs = require('fs');

const BOT_ID = '1528908590822199497';
const BOT_TOKEN = 'MTUyODkwODU5MDgyMjE5OT45Nw.G1jHb4.YlFpInyTnIuqoKMs7eJr1S5SsSo5HFeYHSxV7g'; // clean string below

function apiRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bot MTUyODkwODU5MDgyMjE5OTQ5Nw.G1jHb4.YlFpInyTnIuqoKMs7eJr1S5SsSo5HFeYHSxV7g`,
        'User-Agent': 'DiscordBot (https://discord.js.org, 14.15.3)',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', () => resolve({ status: 0, data: {} }));
    req.end();
  });
}

async function main() {
  console.log(`🏈 Checking commands registered to application ${BOT_ID}...\n`);

  // Check global commands registered by this bot
  const res = await apiRequest(`/applications/${BOT_ID}/commands`);

  console.log(`Status: ${res.status}`);
  if (res.status === 200 && Array.isArray(res.data)) {
    console.log(`✅ Found ${res.data.length} commands registered to your bot!`);
    console.log(JSON.stringify(res.data, null, 2));
  } else {
    console.log('Response:', JSON.stringify(res.data, null, 2));
  }
}

main().catch(console.error);
