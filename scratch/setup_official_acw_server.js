// scratch/setup_official_acw_server.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

const ACW_GUILD_ID = '1525985063143997691'; // ACW S1 | Regular Season official server

async function run() {
  try {
    console.log(`=== Setting up Bot for Official ACW Server (${ACW_GUILD_ID}) ===`);

    // 1. Update config.json
    config.guildId = ACW_GUILD_ID;
    config.leagueName = "ACW Park Wars League";
    fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2), 'utf8');

    // 2. Fetch ACW server roles
    const rolesRes = await fetch(`https://discord.com/api/v9/guilds/${ACW_GUILD_ID}/roles`, {
      headers: { Authorization: USER_TOKEN }
    });
    const roles = await rolesRes.json();

    if (Array.isArray(roles)) {
      console.log(`Found ${roles.length} roles in official ACW server.`);
      
      const roleMap = {
        fo: roles.find(r => r.name.toLowerCase() === 'franchise owner' || r.name.toLowerCase() === 'crew owners'),
        gm: roles.find(r => r.name.toLowerCase() === 'general manager'),
        hc: roles.find(r => r.name.toLowerCase() === 'head coach'),
        ac: roles.find(r => r.name.toLowerCase() === 'assistant coach'),
        captain: roles.find(r => r.name.toLowerCase() === 'captain')
      };

      if (!config.franchiseRoles) config.franchiseRoles = {};
      if (roleMap.fo) config.franchiseRoles.fo = roleMap.fo.id;
      if (roleMap.gm) config.franchiseRoles.gm = roleMap.gm.id;
      if (roleMap.hc) config.franchiseRoles.hc = roleMap.hc.id;
      if (roleMap.ac) config.franchiseRoles.ac = roleMap.ac.id;
      if (roleMap.captain) config.franchiseRoles.captain = roleMap.captain.id;
    }

    // 3. Fetch ACW server channels
    const chRes = await fetch(`https://discord.com/api/v9/guilds/${ACW_GUILD_ID}/channels`, {
      headers: { Authorization: USER_TOKEN }
    });
    const channels = await chRes.json();

    if (Array.isArray(channels)) {
      console.log(`Found ${channels.length} channels in official ACW server.`);
      
      if (!config.channels) config.channels = {};

      const channelFinders = {
        transactions: channels.find(c => c.name.includes('transaction')),
        crewlist: channels.find(c => c.name.includes('crew-list') || c.name.includes('crewlist')),
        powerRankings: channels.find(c => c.name.includes('power-ranking') || c.name.includes('powerrankings')),
        topList: channels.find(c => c.name.includes('top-list') || c.name.includes('toplist')),
        suspensions: channels.find(c => c.name.includes('suspension') && !c.name.includes('rules')),
        suspensionRules: channels.find(c => c.name.includes('suspension-rules')),
        modStrikes: channels.find(c => c.name.includes('mod-strike'))
      };

      for (const [k, ch] of Object.entries(channelFinders)) {
        if (ch) {
          config.channels[k] = ch.id;
          console.log(`- Configured channel "${k}": #${ch.name} (${ch.id})`);
        }
      }
    }

    fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2), 'utf8');
    console.log('🎉 Config updated for official ACW server!');

  } catch (err) {
    console.error(err);
  }
}

run();
