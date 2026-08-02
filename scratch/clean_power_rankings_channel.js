require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

function getBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN.trim().replace(/^["']|["']$/g, '');
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase().includes('token')) {
      const val = process.env[key];
      if (val && val.length > 20 && val !== 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        return val.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  const fallbackB64 = "TVRVeU9USTFNak16T0RBM016YzJOREF3TXcuR2k3T2VJLlkyMnUtT2hhQmE2UlZQMnp3VUFzczRuU3NadHBxT1BiS2w3dmFN";
  return Buffer.from(fallbackB64, 'base64').toString('utf8');
}

const REF_PATH = path.join(__dirname, '../data/powerrankings_msg.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', async () => {
  console.log(`[CLEAN POWER RANKINGS] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (!guild) {
    console.error('Guild not found');
    process.exit(1);
  }

  const channel = guild.channels.cache.find(
    c => c.isTextBased() && (c.name.includes('power-rankings') || c.name.includes('powerrankings'))
  );

  if (!channel) {
    console.error('Power Rankings channel not found');
    process.exit(1);
  }

  console.log(`[CLEAN POWER RANKINGS] Purging old messages in #${channel.name}...`);
  try {
    const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (fetched && fetched.size > 0) {
      for (const msg of fetched.values()) {
        await msg.delete().catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error deleting old messages:', err);
  }

  console.log('[CLEAN POWER RANKINGS] Posting single clean Hidden embed...');
  const closedEmbed = new EmbedBuilder()
    .setColor('#ED4245')
    .setAuthor({ name: 'ACW S1 | Playoffs', iconURL: guild.iconURL({ dynamic: true }) })
    .setTitle('🔒 Power Rankings Hidden for Playoffs')
    .setDescription('**The Regular Season has concluded!**\n\nPower Rankings and Standings are currently **hidden** for the duration of the Playoffs. They will return once the Playoffs are complete.')
    .setTimestamp();

  const newMsg = await channel.send({
    content: '🔒 **POWER RANKINGS HIDDEN FOR PLAYOFFS**',
    embeds: [closedEmbed]
  }).catch(console.error);

  if (newMsg) {
    fs.writeFileSync(REF_PATH, JSON.stringify({ channelId: channel.id, messageId: newMsg.id }, null, 2), 'utf8');
    console.log(`[CLEAN POWER RANKINGS] Message created (ID: ${newMsg.id}) and saved to ref file.`);
  }

  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
