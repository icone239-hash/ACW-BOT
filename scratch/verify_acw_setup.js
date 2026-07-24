// scratch/verify_acw_setup.js
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
    console.log('--- Verifying ACW Setup in Target Server ---');
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!guild) {
      console.error(`Guild ${TARGET_GUILD_ID} not found.`);
      process.exit(1);
    }

    console.log(`Guild Name: ${guild.name}`);
    console.log(`Guild ID: ${guild.id}`);

    // Verify Essential Roles
    const essentialRoles = ['Free Agent', 'Suspended', 'Owner', 'Franchise Owner', 'Co-Owner', 'General Manager', 'Head Coach', 'Assistant Coach', 'Captain'];
    console.log('\n--- Checking Essential Roles ---');
    for (const rName of essentialRoles) {
      const found = guild.roles.cache.find(r => r.name.toLowerCase() === rName.toLowerCase());
      console.log(`- Role "${rName}": ${found ? `✅ (ID: ${found.id})` : '❌ Missing'}`);
    }

    // Verify / Auto-Link Key Channels
    console.log('\n--- Checking Key Channels ---');
    const channels = guild.channels.cache;
    const channelMap = {
      transactions: channels.find(c => c.name.includes('transaction')),
      crewlist: channels.find(c => c.name.includes('crew-list') || c.name.includes('crewlist')),
      powerRankings: channels.find(c => c.name.includes('power-ranking') || c.name.includes('powerrankings')),
      topList: channels.find(c => c.name.includes('top-list') || c.name.includes('toplist')),
      suspensions: channels.find(c => c.name.includes('suspension') && !c.name.includes('rules')),
      suspensionRules: channels.find(c => c.name.includes('suspension-rules')),
      modStrikes: channels.find(c => c.name.includes('mod-strike')),
      log: channels.find(c => c.name.includes('log'))
    };

    for (const [key, ch] of Object.entries(channelMap)) {
      console.log(`- Channel "${key}": ${ch ? `✅ #${ch.name} (ID: ${ch.id})` : '⚠️ Missing (Will create on command use)'}`);
      if (ch && config.channels) {
        config.channels[key] = ch.id;
      }
    }

    fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2), 'utf8');
    console.log('\n🎉 ACW setup verification complete! Config file updated.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
