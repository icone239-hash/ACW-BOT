// scratch/recreate_roles.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  try {
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!targetGuild) {
      console.error('Target guild not found.');
      process.exit(1);
    }

    console.log('Recreating "Crew Owners" and "Captain" roles...');

    // 1. Create Crew Owners
    let crewOwnersRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === 'crew owners');
    if (!crewOwnersRole) {
      crewOwnersRole = await targetGuild.roles.create({
        name: 'Crew Owners',
        color: '#E91E63', // Pink
        hoist: true,
        mentionable: true,
        reason: 'Recreate essential role'
      });
      console.log(`✅ Created "Crew Owners" role: ${crewOwnersRole.id}`);
    } else {
      console.log(`"Crew Owners" role already exists: ${crewOwnersRole.id}`);
    }

    // 2. Create Captain
    let captainRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === 'captain');
    if (!captainRole) {
      captainRole = await targetGuild.roles.create({
        name: 'Captain',
        color: '#1ABC9C', // Teal
        hoist: true,
        mentionable: true,
        reason: 'Recreate essential role'
      });
      console.log(`✅ Created "Captain" role: ${captainRole.id}`);
    } else {
      console.log(`"Captain" role already exists: ${captainRole.id}`);
    }

    // 3. Move them below the bot
    const botMember = await targetGuild.members.fetch(client.user.id);
    const botPos = botMember.roles.highest.position;

    // Set position just below the bot
    await crewOwnersRole.setPosition(botPos - 1).catch(console.error);
    await captainRole.setPosition(botPos - 2).catch(console.error);
    console.log('Positions updated successfully.');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
