// scratch/sync_acw_teams_and_records.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const db = require('../database');
const fs = require('fs');
const path = require('path');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');
const { updateCrewListMessage } = require('../utils/crewListMessage');

const ACW_SERVER_ID = '1525985063143997691';
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('=== Matching Teams & Roles in Official ACW Server ===');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    console.log(`Guild: ${guild.name}`);

    const roles = await guild.roles.fetch();
    console.log(`Fetched ${roles.size} roles from server.`);

    const teams = db.getTeams();
    let updatedCount = 0;

    for (const team of teams) {
      // Find matching role in official ACW server
      const matchRole = roles.find(r => r.name.toLowerCase() === team.name.toLowerCase());
      if (matchRole) {
        team.roleId = matchRole.id;
        updatedCount++;
        console.log(`✅ Linked team "${team.name}" -> Role ID ${matchRole.id}`);
      }

      // Update HAX record to 11-2 as requested by user
      if (team.name.toLowerCase() === 'hax') {
        team.wins = 11;
        team.losses = 2;
        team.ties = 0;
        console.log('🏆 Set HAX record to 11-2!');
      }
    }

    fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
    console.log(`Saved ${teams.length} teams (${updatedCount} roles linked).`);

    // Sync crewlist.json roleIds as well
    const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
    if (fs.existsSync(CREWLIST_PATH)) {
      const crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8'));
      for (const entry of crewList) {
        const matchRole = roles.find(r => r.name.toLowerCase() === entry.team.toLowerCase());
        if (matchRole) {
          entry.roleId = matchRole.id;
        }
      }
      fs.writeFileSync(CREWLIST_PATH, JSON.stringify(crewList, null, 2), 'utf8');
      console.log('Saved crewlist.json with updated role IDs.');
    }

    // Refresh live Power Rankings & Crew List messages
    await updatePowerRankingsMessage(guild);
    await updateCrewListMessage(guild);

    console.log('🎉 Successfully synced ACW team roles, set HAX to 11-2, and updated Power Rankings!');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing teams:', err);
    process.exit(1);
  }
});

client.login(config.token);
