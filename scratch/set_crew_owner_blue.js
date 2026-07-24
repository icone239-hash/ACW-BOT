// scratch/set_crew_owner_blue.js
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

    const targetRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === 'crew owners');
    if (!targetRole) {
      console.error('"Crew Owners" role not found in target server.');
      process.exit(1);
    }

    // Set to Discord blue (#3498db / decimal 3447003) or vivid blue
    const blueColor = '#3498DB'; 
    await targetRole.setColor(blueColor);
    console.log(`✅ Updated target "Crew Owners" role color to blue: ${blueColor}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
