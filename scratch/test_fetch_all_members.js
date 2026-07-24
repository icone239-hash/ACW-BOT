// scratch/test_fetch_all_members.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const ACW_SERVER_ID = '1525985063143997691';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    console.log('Fetching all members...');
    const members = await guild.members.fetch();
    console.log(`Successfully cached ${members.size} members!`);

    const ids = ['819375803556560907', '1515886618232225892'];
    for (const id of ids) {
      const m = members.get(id);
      if (m) {
        console.log(`Found ID ${id}: User: ${m.user.username} (${m.user.globalName || ''}), Mention: <@${id}>`);
      } else {
        console.log(`ID ${id} NOT in server.`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
