// scratch/test_token.js
const TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_GUILD_ID = '1525985063143997691';

async function run() {
  try {
    console.log('Testing user token authorization using native fetch...');
    const res = await fetch(`https://discord.com/api/v9/guilds/${SOURCE_GUILD_ID}/roles`, {
      headers: {
        Authorization: TOKEN
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log(`✅ Token is valid! Found ${data.length} roles in the source server.`);
  } catch (err) {
    console.error('❌ Failed to authenticate or fetch roles:', err.message);
  }
}

run();
