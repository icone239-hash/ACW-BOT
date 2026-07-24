// scratch/register_existing_roles_as_teams.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const db = require('../database');
const fs = require('fs');
const path = require('path');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// A known list of team names from the source server layout
const sourceTeamNames = [
  'HAX', 'Repent', 'Striker', 'Ascendant III', 'Desire', 'Overkill', 'Shine', 'Haunt',
  'Passion', 'Affinity', 'Spain', 'Sinned', 'FollowHer', 'Egypt', 'Revenge', 'Saintly',
  'Destiny', 'ShottaClock', 'whiplash', 'Cubanos', 'Regain', 'Pain', 'Jams Academy',
  'quray', 'Reaper', 'volKno', 'Aspen'
];

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!guild) {
      console.error('Target guild not found.');
      process.exit(1);
    }

    console.log('Fetching roles from target server...');
    const roles = await guild.roles.fetch();

    const teams = db.getTeams();
    let updated = false;

    // Loop through the known team names
    for (const name of sourceTeamNames) {
      const role = roles.find(r => r.name.toLowerCase() === name.toLowerCase());
      if (role) {
        // Check if already in database
        const existing = teams.find(t => t.name.toLowerCase() === name.toLowerCase() || t.roleId === role.id);
        if (!existing) {
          // Add to database
          const newTeamId = teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1;
          const newTeam = {
            id: newTeamId,
            name: role.name,
            abbreviation: role.name.slice(0, 4).toUpperCase(),
            logo: '',
            roleId: role.id,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            createdAt: new Date().toISOString()
          };
          teams.push(newTeam);
          console.log(`✅ Registered team "${role.name}" in database (Role: ${role.id})`);
          updated = true;
        }
      }
    }

    if (updated) {
      const dbPath = path.join(__dirname, '../data/teams.json');
      fs.writeFileSync(dbPath, JSON.stringify(teams, null, 2), 'utf8');
      console.log('Database updated successfully.');
    } else {
      console.log('No new team roles found to register.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
