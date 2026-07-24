// scratch/set_exact_pw_blue.js
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
      console.error('"Crew Owners" role not found.');
      process.exit(1);
    }

    // Set to the bright blue color from the PW server (#0051ff / decimal 20991)
    const pwBlue = 20991; 
    await targetRole.setColor(pwBlue);
    console.log(`✅ Updated target "Crew Owners" role color to the exact PW blue: #0051ff`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
