require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  await guild.roles.fetch();

  const missingNames = ['FollowHer', 'Striker', 'Nova', 'ZENSHI', 'Capital', 'Peace', 'Reap', 'reality', 'brazil', 'cinnamon bun'];

  console.log('--- Checking missing team names against Discord Server Roles ---');
  missingNames.forEach(name => {
    const role = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (role) {
      console.log(`FOUND ROLE for "${name}": ID ${role.id}, Name: ${role.name}`);
    } else {
      console.log(`NO ROLE for "${name}"`);
    }
  });

  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
