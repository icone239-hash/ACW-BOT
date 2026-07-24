// scratch/sync_and_seed_powerrankings.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const db = require('../database');
const fs = require('fs');
const path = require('path');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const teamSpecs = [
  { name: 'HAX', wins: 5, losses: 0, ties: 0 },
  { name: '-china-', wins: 4, losses: 1, ties: 0 },
  { name: 'quray', wins: 3, losses: 1, ties: 0 },
  { name: 'Jams Academy', wins: 1, losses: 0, ties: 0 },
  { name: 'Regain', wins: 0, losses: 1, ties: 0 },
  { name: 'volKno', wins: 0, losses: 1, ties: 0 },
  { name: 'Pain', wins: 0, losses: 2, ties: 0 },
  { name: 'Reaper', wins: 0, losses: 6, ties: 0 }
];

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!guild) {
      console.error('Target guild not found.');
      process.exit(1);
    }

    console.log('Syncing roles for Power Rankings teams...');
    const roles = await guild.roles.fetch();

    const seededTeams = [];

    for (let spec of teamSpecs) {
      let role = roles.find(r => r.name.toLowerCase() === spec.name.toLowerCase());
      if (!role) {
        // Create the role if it doesn't exist
        role = await guild.roles.create({
          name: spec.name,
          color: '#3498db', // Default blue
          hoist: true,
          mentionable: true,
          reason: 'Power Rankings Seed'
        });
        console.log(`✅ Created missing role "${spec.name}": ${role.id}`);
      } else {
        console.log(`Role "${spec.name}" already exists: ${role.id}`);
      }

      seededTeams.push({
        id: seededTeams.length + 1,
        name: spec.name,
        abbreviation: spec.name.slice(0, 4).toUpperCase(),
        logo: '',
        roleId: role.id,
        wins: spec.wins,
        losses: spec.losses,
        ties: spec.ties,
        pointsFor: spec.wins * 4, // dummy points
        pointsAgainst: spec.losses * 2
      });
    }

    // Overwrite database teams file with ONLY these 8 teams
    console.log('Overwriting database teams list with only the 8 specified teams...');
    const dbPath = path.join(__dirname, '../data/teams.json');
    fs.writeFileSync(dbPath, JSON.stringify(seededTeams, null, 2), 'utf8');

    // Run the power rankings update
    console.log('Triggering Power Rankings embed update...');
    const { updatePowerRankingsMessage } = require('../utils/powerRankings');
    await updatePowerRankingsMessage(guild);

    console.log('🎉 Seed complete! Power Rankings updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
