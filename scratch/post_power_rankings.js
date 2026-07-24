// scratch/post_power_rankings.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');

const TARGET_GUILD_ID = '1528909271633363185';
const TARGET_CHANNEL_ID = '1528944558065324062';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    const channel = client.channels.cache.get(TARGET_CHANNEL_ID);

    if (!guild || !channel) {
      console.error('Guild or channel not found.');
      process.exit(1);
    }

    console.log('Clearing old messages in power-rankings channel...');
    const fetched = await channel.messages.fetch({ limit: 50 });
    for (const msg of fetched.values()) {
      await msg.delete().catch(() => {});
    }

    // Reset saved message reference to force a fresh post
    const fs = require('fs');
    const path = require('path');
    const refPath = path.join(__dirname, '../data/powerrankings_msg.json');
    fs.writeFileSync(refPath, JSON.stringify({ channelId: null, messageId: null }, null, 2), 'utf8');

    console.log('Triggering new Power Rankings post...');
    await updatePowerRankingsMessage(guild);

    console.log('🎉 Power rankings layout updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
