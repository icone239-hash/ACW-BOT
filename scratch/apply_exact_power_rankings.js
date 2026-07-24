// scratch/apply_exact_power_rankings.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');
const { updateCrewListMessage } = require('../utils/crewListMessage');

const ACW_SERVER_ID = '1525985063143997691';
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');

const targetStandings = [
  { name: 'HAX', wins: 11, losses: 2 },
  { name: '-china-', wins: 8, losses: 5 },
  { name: 'quray', wins: 1, losses: 1 },
  { name: 'Haunt', wins: 1, losses: 1 },
  { name: 'AceSlammmn', wins: 1, losses: 1 },
  { name: 'Egypt', wins: 1, losses: 0 },
  { name: 'Saintly', wins: 0, losses: 1 },
  { name: 'Affinity', wins: 0, losses: 1 },
  { name: 'shine', wins: 0, losses: 1 },
  { name: 'Regain', wins: 0, losses: 1 },
  { name: 'Pain', wins: 0, losses: 3 }
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('=== Updating ACW Power Rankings Records ===');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    const roles = await guild.roles.fetch();

    let teams = [];
    if (fs.existsSync(TEAMS_PATH)) {
      teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
    }

    // Filter out unknown-role / dummy teams
    teams = teams.filter(t => t.name.toLowerCase() !== 'unknown-role' && !t.name.toLowerCase().includes('unknown'));

    for (const item of targetStandings) {
      let team = teams.find(t => t.name.toLowerCase() === item.name.toLowerCase() || t.name.toLowerCase().includes(item.name.toLowerCase()));
      
      const roleMatch = roles.find(r => r.name.toLowerCase() === item.name.toLowerCase() || r.name.toLowerCase().includes(item.name.toLowerCase()));

      if (!team) {
        team = {
          id: teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1,
          name: item.name,
          abbreviation: item.name.substring(0, 4).toUpperCase(),
          logo: '',
          roleId: roleMatch ? roleMatch.id : null,
          wins: item.wins,
          losses: item.losses,
          ties: 0,
          pointsFor: item.wins * 4,
          pointsAgainst: item.losses * 2
        };
        teams.push(team);
      } else {
        team.wins = item.wins;
        team.losses = item.losses;
        team.ties = 0;
        if (roleMatch) team.roleId = roleMatch.id;
      }
      console.log(`✅ ${team.name}: ${team.wins} - ${team.losses} (Role: ${team.roleId || 'None'})`);
    }

    fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
    console.log(`Saved updated teams to ${TEAMS_PATH}`);

    await updatePowerRankingsMessage(guild);
    await updateCrewListMessage(guild);

    console.log('🎉 Successfully applied exact Power Rankings and refreshed live message!');
    process.exit(0);
  } catch (err) {
    console.error('Error applying standings:', err);
    process.exit(1);
  }
});

client.login(config.token);
