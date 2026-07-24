// scratch/post_top_list.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { buildTopListEmbed, buildTopListDropdown } = require('../utils/topListHelper');

const TARGET_GUILD_ID = '1528909271633363185';
const TARGET_CHANNEL_ID = '1528944559931920484'; // #top-list

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    const channel = client.channels.cache.get(TARGET_CHANNEL_ID);

    if (!guild || !channel) {
      console.error('Guild or #top-list channel not found.');
      process.exit(1);
    }

    console.log('Clearing old messages in #top-list channel...');
    const fetched = await channel.messages.fetch({ limit: 50 });
    for (const msg of fetched.values()) {
      await msg.delete().catch(() => {});
    }

    console.log('Posting official ACW Preseason Top List message...');
    const embed = buildTopListEmbed('all', guild);
    const row = buildTopListDropdown('all');

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    console.log('🎉 Top list posted successfully in #top-list channel!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
