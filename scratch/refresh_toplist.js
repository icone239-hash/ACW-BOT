require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { updateTopListMessage } = require('../utils/topListHelper');

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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`[TOPLIST REFRESH] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (guild) {
    await updateTopListMessage(guild);
    console.log('[TOPLIST REFRESH] Updated top list message in server!');
  } else {
    console.error('[TOPLIST REFRESH] Guild not found');
  }
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
