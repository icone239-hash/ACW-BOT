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

const BLACKLIST_NAMES = [
  'security team', 'livestreams', 'wr', 'events', 'qb', 'very good sex',
  'general manager', 'commissioner', 'community manager', 'verified',
  'unverified', 'members', 'level 5', 'level 10', 'level 15', 'level 20',
  'level 25', 'level 30', 'mvp', 'dpoy', 'opoy', 'wroy', 'rdoty', 'hcoty',
  '1st team all-pro s1', '2nd team all-pro s1', 's1 acw preseason champs',
  'new role', 'resurrection', 'resurection', 'bp', 'jp', 'stage perms'
];

let crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8'));
let teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));

console.log('Original Crew Count:', crewList.length);

const filteredCrewList = crewList.filter(c => {
  const nameLower = c.team.toLowerCase().trim();
  return !BLACKLIST_NAMES.includes(nameLower);
});

console.log('Filtered Crew Count:', filteredCrewList.length);

const validNames = new Set(filteredCrewList.map(c => c.team.toLowerCase().trim()));
const filteredTeams = teams.filter(t => validNames.has(t.name.toLowerCase().trim()));

fs.writeFileSync(CREWLIST_PATH, JSON.stringify(filteredCrewList, null, 2), 'utf8');
fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(filteredCrewList, null, 2), 'utf8');

fs.writeFileSync(TEAMS_PATH, JSON.stringify(filteredTeams, null, 2), 'utf8');
fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(filteredTeams, null, 2), 'utf8');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`[PURGE UTILITY ROLES] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (guild) {
    console.log('[PURGE UTILITY ROLES] Refreshing #crew-list...');
    await updateCrewListMessage(guild).catch(console.error);

    console.log('[PURGE UTILITY ROLES] Refreshing #power-rankings...');
    await updatePowerRankingsMessage(guild).catch(console.error);

    console.log('[PURGE UTILITY ROLES] Done!');
  }
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
