// scratch/resolve_role_ids.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const ids = [
  '1526013210283737128', // HAX
  '1526687640307630282', // China
  '1526273201628254362', // Quray
  '1526310732818550894', // Jams Academy
  '1527445549320507514', // Regain
  '1526232088565780623', // ?
  '1527391409450254356', // Pain?
  '1526249520399384637'  // ?
];

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    console.log('Resolving roles in target guild...');
    const roles = await guild.roles.fetch();
    
    ids.forEach(id => {
      // Find role in target guild by name or by ID
      const byId = roles.get(id);
      if (byId) {
        console.log(`ID ${id} -> Name: ${byId.name} (Direct Match)`);
      } else {
        // Find role by searching names of source roles or target roles
        const matchingName = roles.find(r => r.name.toLowerCase().includes(id) || id.includes(r.id));
        if (matchingName) {
          console.log(`ID ${id} -> Name: ${matchingName.name} (Indirect Match)`);
        } else {
          console.log(`ID ${id} -> NOT FOUND IN TARGET GUILD`);
        }
      }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
