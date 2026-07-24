// scratch/create_mod_strikes_channel.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!guild) process.exit(1);

    let channel = guild.channels.cache.find(c => c.name.includes('mod-strike'));
    if (!channel) {
      console.log('Creating #⚠️ㆍmod-strikes channel...');
      channel = await guild.channels.create({
        name: '⚠️ㆍmod-strikes',
        reason: 'Create mod strikes logging channel'
      });
      console.log(`✅ Created channel #${channel.name} (ID: ${channel.id})`);
    } else {
      console.log(`⏩ Channel #${channel.name} already exists (ID: ${channel.id})`);
    }

    if (!config.channels) config.channels = {};
    config.channels.modStrikes = channel.id;

    fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2), 'utf8');
    console.log('🎉 Mod strikes channel linked in config!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
