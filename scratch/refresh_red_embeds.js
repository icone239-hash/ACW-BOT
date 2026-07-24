// scratch/refresh_red_embeds.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { updateCrewListMessage } = require('../utils/crewListMessage');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');

const ACW_SERVER_ID = '1525985063143997691';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('--- Refreshing Live Embeds with Red Accent Color ---');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    await updateCrewListMessage(guild);
    await updatePowerRankingsMessage(guild);
    console.log('🎉 Successfully updated live embeds to red (#ED4245)!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
