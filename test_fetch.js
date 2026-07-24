// test_fetch.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const guild = client.guilds.cache.get('1525985063143997691') || client.guilds.cache.first();
    console.log(`Guild: ${guild.name} (${guild.id})`);

    console.log('Fetching members via REST (limit: 1000)...');
    const members = await guild.members.fetch({ limit: 1000 });
    console.log(`Fetched ${members.size} members!`);

    const regainRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'regain');
    if (regainRole) {
      const roleMembers = members.filter(m => m.roles.cache.has(regainRole.id));
      console.log(`Found ${roleMembers.size} members in role Regain:`);
      roleMembers.forEach(m => console.log(`- ${m.user.username} (${m.id})`));
    } else {
      console.log('Regain role not found.');
    }
  } catch (err) {
    console.error('Error fetching members:', err);
  }
  client.destroy();
});

client.login(config.token);
