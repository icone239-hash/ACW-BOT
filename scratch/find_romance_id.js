// scratch/find_romance_id.js
const config = require('../config.json');
const ACW_SERVER_ID = '1525985063143997691';

async function run() {
  console.log('--- Searching ACW Server Members for ijustwantromance ---');
  const queries = ['romance', 'ijust', 'rom', 'want', 'zayden', 'zay'];
  for (const q of queries) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${ACW_SERVER_ID}/members/search?query=${encodeURIComponent(q)}&limit=20`, {
        headers: { Authorization: `Bot ${config.token}` }
      });
      if (res.ok) {
        const matches = await res.json();
        console.log(`Query "${q}" returned ${matches.length} matches:`);
        matches.forEach(m => console.log(`  - Username: "${m.user.username}" | Nick: "${m.nick || ''}" | Global: "${m.user.global_name || ''}" | ID: ${m.user.id}`));
      } else {
        console.log(`Query "${q}" status: ${res.status}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

run();
