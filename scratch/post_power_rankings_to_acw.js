// scratch/post_power_rankings_to_acw.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');

const ACW_SERVER_ID = '1525985063143997691';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('--- Posting Power Rankings to Official ACW Channel ---');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    console.log(`Guild: ${guild.name} (${guild.id})`);

    await updatePowerRankingsMessage(guild);

    console.log('🎉 Successfully posted/updated Official Power Rankings in ACW #power-rankings!');
    process.exit(0);
  } catch (err) {
    console.error('Error posting power rankings:', err);
    process.exit(1);
  }
});

client.login(config.token);
