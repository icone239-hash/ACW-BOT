// scratch/test_fetch_acw.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const ACW_SERVER_ID = '1525985063143997691';
const SUSPENSION_CHANNEL_ID = '1526012668752953414';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('Fetching official ACW guild...');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    console.log(`✅ Guild fetched: ${guild.name} (${guild.id})`);

    console.log('Fetching official ACW suspensions channel...');
    const channel = await client.channels.fetch(SUSPENSION_CHANNEL_ID);
    console.log(`✅ Channel fetched: #${channel.name} (${channel.id}) in Guild ${channel.guild.name}`);

    process.exit(0);
  } catch (err) {
    console.error('Fetch error:', err);
    process.exit(1);
  }
});

client.login(config.token);
