// scratch/sync_crew_owner_color.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_GUILD_ID = '1525985063143997691';
const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function apiFetch(endpoint) {
  const res = await fetch(`https://discord.com/api/v9${endpoint}`, {
    headers: {
      Authorization: USER_TOKEN
    }
  });
  return res.json();
}

client.once('ready', async () => {
  try {
    console.log('Fetching source server roles to find the Crew Owner color...');
    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    
    // Find "Crew Owner" or "Crew Owners" role in the source
    const sourceRole = sRoles.find(r => {
      const name = r.name.toLowerCase();
      return name === 'crew owner' || name === 'crew owners';
    });

    if (!sourceRole) {
      console.error('❌ Could not find "Crew Owner" or "Crew Owners" role in source server.');
      process.exit(1);
    }

    const sourceColorHex = '#' + sourceRole.color.toString(16).padStart(6, '0');
    console.log(`✅ Found role "${sourceRole.name}" in source server with color: ${sourceColorHex} (${sourceRole.color})`);

    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!targetGuild) {
      console.error('❌ Target guild not found.');
      process.exit(1);
    }

    const targetRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === 'crew owners');
    if (!targetRole) {
      console.error('❌ "Crew Owners" role not found in target server.');
      process.exit(1);
    }

    // Update target role color
    await targetRole.setColor(sourceRole.color);
    console.log(`✅ Updated target "Crew Owners" role color to ${sourceColorHex}!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
});

client.login(config.token);
