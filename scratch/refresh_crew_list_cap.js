// scratch/refresh_crew_list_cap.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { updateCrewListMessage } = require('../utils/crewListMessage');

const ACW_SERVER_ID = '1525985063143997691';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('--- Updating Crew List Cap in ACW Server ---');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    await updateCrewListMessage(guild);
    console.log('🎉 Successfully updated Crew List message cap to 30!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
