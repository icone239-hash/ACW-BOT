// scratch/check_channel_id.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const TARGET_GUILD_ID = '1528909271633363185';
const ID_TO_CHECK = '1524510099698090136';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    const channel = guild.channels.cache.get(ID_TO_CHECK);
    if (channel) {
      console.log(`✅ Found channel ${ID_TO_CHECK} named: "${channel.name}" in testing server!`);
    } else {
      console.log(`❌ Channel ${ID_TO_CHECK} NOT found in testing server.`);
      console.log('Available channels in testing server:');
      guild.channels.cache.forEach(c => {
        console.log(`- ${c.name} (${c.id})`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
