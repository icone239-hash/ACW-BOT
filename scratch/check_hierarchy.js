// scratch/check_hierarchy.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  try {
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    const botMember = await targetGuild.members.fetch(client.user.id);
    const highestPos = botMember.roles.highest.position;
    console.log(`Bot's highest role is "${botMember.roles.highest.name}" at position ${highestPos}`);
    
    const targetRoles = [...(await targetGuild.roles.fetch()).values()]
      .sort((a, b) => b.position - a.position);

    console.log('Roles above the bot:');
    targetRoles.filter(r => r.position > highestPos).forEach(r => {
      console.log(`- ${r.name} (Position: ${r.position})`);
    });

    console.log('Roles below the bot:');
    targetRoles.filter(r => r.position < highestPos).forEach(r => {
      console.log(`- ${r.name} (Position: ${r.position})`);
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

client.login(config.token);
