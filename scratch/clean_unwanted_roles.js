// scratch/clean_unwanted_roles.js
// Deletes roles in target guild that do not exist (by name) in the source guild, using correct position comparison.

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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API ${res.status}: ${errText}`);
  }
  return res.json();
}

client.once('ready', async () => {
  console.log(`Logged in as bot: ${client.user.tag}`);

  try {
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!targetGuild) {
      console.error(`❌ Target server (ID: ${TARGET_GUILD_ID}) not found.`);
      process.exit(1);
    }

    console.log('Fetching source server roles...');
    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    const sourceRoleNames = new Set(sRoles.map(r => r.name.toLowerCase()));
    sourceRoleNames.add('@everyone');

    console.log(`Source server has ${sRoles.length} roles.`);

    console.log('Fetching target server roles...');
    const targetRoles = await targetGuild.roles.fetch();
    const botMember = await targetGuild.members.fetch(client.user.id);
    const highestBotRolePos = botMember.roles.highest.position;

    let deletedCount = 0;
    console.log('Deleting roles...');

    for (const [, role] of targetRoles) {
      if (
        role.id !== targetGuild.roles.everyone.id &&
        !role.managed &&
        role.position < highestBotRolePos
      ) {
        const roleNameLower = role.name.toLowerCase();

        // If the role is NOT in the source server list, delete it!
        if (!sourceRoleNames.has(roleNameLower)) {
          console.log(`Deleting role: "${role.name}" (Pos: ${role.position})`);
          await role.delete('Cleaning extra roles').catch(e => console.warn(`Could not delete role ${role.name}: ${e.message}`));
          deletedCount++;
        }
      }
    }

    console.log(`🎉 Cleaning complete! Deleted ${deletedCount} extra roles from the target server.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Role cleaning failed:', error);
    process.exit(1);
  }
});

client.login(config.token);
