// scratch/test_fetch_individual_members.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const ACW_SERVER_ID = '1525985063143997691';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    
    const ids = ['819375803556560907', '1515886618232225892'];
    for (const id of ids) {
      try {
        const m = await guild.members.fetch(id);
        console.log(`[SUCCESS] Found member ${id}: Username: "${m.user.username}" | Nick: "${m.nickname || ''}" | Global: "${m.user.globalName || ''}"`);
      } catch (e) {
        console.log(`[FAILED] ID ${id} not in guild: ${e.message}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
