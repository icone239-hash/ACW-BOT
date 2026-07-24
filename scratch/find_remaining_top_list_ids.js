// scratch/find_remaining_top_list_ids.js
const config = require('../config.json');
const ACW_SERVER_ID = '1525985063143997691';

const queries = ['romance', 'ijustwant', 'rz', 'eliminate', 'eepli', 'larp', 'starfits', 'ihyram', 'zayden', 'shegoing'];

async function run() {
  console.log('--- Searching Remaining User IDs ---');
  for (const q of queries) {
    try {
      await new Promise(r => setTimeout(r, 600));
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
