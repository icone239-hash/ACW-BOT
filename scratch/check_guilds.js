// scratch/check_guilds.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Currently in the following guilds:');
  client.guilds.cache.forEach(guild => {
    console.log(`- Name: ${guild.name} | ID: ${guild.id}`);
  });
  process.exit(0);
});

client.login(config.token);
