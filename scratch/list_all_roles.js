// scratch/list_all_roles.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_GUILD_ID = '1525985063143997691';
const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
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
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    const targetRoles = await targetGuild.roles.fetch();
    console.log(`Target server has ${targetRoles.size} roles:`);
    targetRoles.forEach(r => {
      console.log(`- ${r.name} (${r.id})`);
    });

    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    console.log(`Source server has ${sRoles.length} roles:`);
    sRoles.forEach(r => {
      console.log(`- ${r.name} (${r.id})`);
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

client.login(config.token);
