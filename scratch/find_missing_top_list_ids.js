// scratch/find_missing_top_list_ids.js
const config = require('../config.json');
const ACW_SERVER_ID = '1525985063143997691';

const queries = ['szn', 'acid', 'dyricss', 'samurai', 'juiw', 'ben', 'change', 'up', 'off', 'romance', 'rz', 'eliminate', 'eepli', 'larp', 'starfits', 'ram', 'zayden'];

async function run() {
  console.log('--- Searching ACW Server Members via Search API ---');
  for (const q of queries) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${ACW_SERVER_ID}/members/search?query=${encodeURIComponent(q)}&limit=10`, {
        headers: { Authorization: `Bot ${config.token}` }
      });
      if (res.ok) {
        const matches = await res.json();
        if (matches.length > 0) {
          matches.forEach(m => console.log(`Query "${q}" -> Username: "${m.user.username}" | Nick: "${m.nick || ''}" | Global: "${m.user.global_name || ''}" | ID: ${m.user.id}`));
        } else {
          console.log(`Query "${q}" -> No matches.`);
        }
      } else {
        console.log(`Query "${q}" -> Status ${res.status}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

run();
