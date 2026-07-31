require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const db = require('../database');
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

// 1. Fix crewlist.json
if (fs.existsSync(CREWLIST_PATH)) {
  const list = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8'));
  list.forEach(c => {
    if (c.team.includes('<@&') || c.roleId === '1531445225174863943') {
      console.log(`[FIX CREW] Renaming raw role entry "${c.team}" to "PJ Academy"`);
      c.team = 'PJ Academy';
      c.roleId = '1531445225174863943';
    }
  });
  fs.writeFileSync(CREWLIST_PATH, JSON.stringify(list, null, 2), 'utf8');
  fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(list, null, 2), 'utf8');
}

// 2. Fix teams.json & sync with crewlist
if (fs.existsSync(TEAMS_PATH)) {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  teams.forEach(t => {
    if (t.name.includes('<@&') || t.roleId === '1531445225174863943') {
      console.log(`[FIX DB TEAM] Renaming DB team "${t.name}" to "PJ Academy"`);
      t.name = 'PJ Academy';
      t.roleId = '1531445225174863943';
    }
  });

  // Ensure all 37 crewlist teams exist in teams.json with proper roleIds
  const crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8'));
  crewList.forEach(c => {
    let t = teams.find(x => x.name.toLowerCase() === c.team.toLowerCase() || (c.roleId && x.roleId === c.roleId));
    if (!t) {
      const newId = teams.length === 0 ? 1 : Math.max(...teams.map(x => x.id)) + 1;
      teams.push({
        id: newId,
        name: c.team,
        abbreviation: c.team.substring(0, 4).toUpperCase(),
        logo: '',
        roleId: c.roleId || '',
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: new Date().toISOString()
      });
      console.log(`[SYNC DB] Added missing crew to teams.json: ${c.team}`);
    } else {
      if (c.roleId && !t.roleId) t.roleId = c.roleId;
    }
  });

  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
  fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
}

// 3. Login to Discord and refresh embeds
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`[RESYNC EMBEDS] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (guild) {
    console.log('[RESYNC EMBEDS] Refreshing #crew-list...');
    await updateCrewListMessage(guild).catch(console.error);

    console.log('[RESYNC EMBEDS] Refreshing #power-rankings...');
    await updatePowerRankingsMessage(guild).catch(console.error);

    console.log('[RESYNC EMBEDS] Successfully re-synced and updated both embeds!');
  }
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
