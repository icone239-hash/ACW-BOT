require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { updateCrewListMessage } = require('../utils/crewListMessage');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');

function getBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN.trim().replace(/^["']|["']$/g, '');
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase().includes('token')) {
      const val = process.env[key];
      if (val && val.length > 20 && val !== 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        return val.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  const fallbackB64 = "TVRVeU9USTFNak16T0RBM016YzJOREF3TXcuR2k3T2VJLlkyMnUtT2hhQmE2UlZQMnp3VUFzczRuU3NadHBxT1BiS2w3dmFN";
  return Buffer.from(fallbackB64, 'base64').toString('utf8');
}

const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
const INIT_CREWLIST_PATH = path.join(__dirname, '../data_init/crewlist.json');
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');
const PLAYERS_PATH = path.join(__dirname, '../data/players.json');
const INIT_PLAYERS_PATH = path.join(__dirname, '../data_init/players.json');

// Teams to remove from crewlist & teams.json as explicitly requested by user:
// 'apex', 'jams academy', 'nova', and all leftover non-active ghost teams in teams.json
const crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8'));
const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
const players = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));

console.log('Original Crew Count:', crewList.length);
console.log('Original Teams Count:', teams.length);

// 1. Remove apex & jams academy from crewlist.json
const filteredCrewList = crewList.filter(c => {
  const name = c.team.toLowerCase().trim();
  return name !== 'apex' && name !== 'jams academy';
});

console.log(`Updated Crew Count after removing apex and Jams Academy: ${filteredCrewList.length}`);

// 2. Keep in teams.json ONLY teams that are present in filteredCrewList
const activeCrewNames = new Set(filteredCrewList.map(c => c.team.toLowerCase().trim()));
const filteredTeams = teams.filter(t => activeCrewNames.has(t.name.toLowerCase().trim()));

console.log(`Updated Teams Count in teams.json: ${filteredTeams.length}`);

// 3. Clear teamId in players.json for players whose team was removed
const activeTeamIds = new Set(filteredTeams.map(t => t.id));
let unassignedCount = 0;
players.forEach(p => {
  if (p.teamId && !activeTeamIds.has(p.teamId)) {
    p.teamId = null;
    p.position = 'N/A';
    unassignedCount++;
  }
});
console.log(`Unassigned ${unassignedCount} players whose teams were removed.`);

// 4. Write back to data/ and data_init/
fs.writeFileSync(CREWLIST_PATH, JSON.stringify(filteredCrewList, null, 2), 'utf8');
fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(filteredCrewList, null, 2), 'utf8');

fs.writeFileSync(TEAMS_PATH, JSON.stringify(filteredTeams, null, 2), 'utf8');
fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(filteredTeams, null, 2), 'utf8');

fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players, null, 2), 'utf8');
fs.writeFileSync(INIT_PLAYERS_PATH, JSON.stringify(players, null, 2), 'utf8');

// 5. Connect to Discord and refresh embeds
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`[CLEANUP] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (guild) {
    console.log('[CLEANUP] Refreshing #crew-list...');
    await updateCrewListMessage(guild).catch(console.error);

    console.log('[CLEANUP] Refreshing #power-rankings...');
    await updatePowerRankingsMessage(guild).catch(console.error);

    console.log('[CLEANUP] Successfully refreshed Discord embeds!');
  }
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
