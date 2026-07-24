// scratch/test_clean.js
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
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    const botMember = await targetGuild.members.fetch(client.user.id);
    
    const highestBotRolePos = botMember.roles.highest.position;
    const highestBotRoleRawPos = botMember.roles.highest.rawPosition;
    
    console.log(`Bot highest role: ${botMember.roles.highest.name}`);
    console.log(`highestBotRolePos = ${highestBotRolePos}`);
    console.log(`highestBotRoleRawPos = ${highestBotRoleRawPos}`);

    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    const sourceRoleNames = new Set(sRoles.map(r => r.name.toLowerCase()));
    sourceRoleNames.add('@everyone');

    const targetRoles = await targetGuild.roles.fetch();
    console.log(`Total target roles: ${targetRoles.size}`);
    
    let matchCount = 0;
    let belowCount = 0;
    let notManagedCount = 0;

    targetRoles.forEach(role => {
      const isEveryone = role.id === targetGuild.roles.everyone.id;
      const isManaged = role.managed;
      const isBelow = role.position < highestBotRolePos;
      const isNotInSource = !sourceRoleNames.has(role.name.toLowerCase());

      if (isBelow) belowCount++;
      if (!isManaged) notManagedCount++;

      if (!isEveryone && !isManaged && isBelow && isNotInSource) {
        matchCount++;
        if (matchCount < 10) {
          console.log(`Match to delete: ${role.name} (Pos: ${role.position})`);
        }
      }
    });

    console.log(`belowCount = ${belowCount}`);
    console.log(`notManagedCount = ${notManagedCount}`);
    console.log(`matchCount = ${matchCount}`);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

client.login(config.token);
