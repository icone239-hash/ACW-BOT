require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const db = require('../database');
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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log(`[SYNC] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('scores') || c.name.includes('score')));
  
  if (!channel) {
    console.error('[SYNC] Scores channel not found');
    process.exit(1);
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  console.log(`[SYNC] Fetched ${messages.size} score messages.`);

  const teams = db.getTeams();
  const teamStats = {};

  // Initialize every team with 0
  teams.forEach(t => {
    teamStats[t.id] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
  });

  // Apply baseline adjustments for teams whose historical matches fell out of 100 limit
  // HAX: 10W - 2L (8W - 0L is in the channel, so baseline is +2W, +2L)
  const haxTeam = teams.find(t => t.name.toLowerCase() === 'hax');
  if (haxTeam && teamStats[haxTeam.id]) {
    teamStats[haxTeam.id].wins = 2;
    teamStats[haxTeam.id].losses = 2;
    teamStats[haxTeam.id].pointsFor = 8;
    teamStats[haxTeam.id].pointsAgainst = 8;
  }

  // Pain: 0W - 3L
  const painTeam = teams.find(t => t.name.toLowerCase() === 'pain');
  if (painTeam && teamStats[painTeam.id]) {
    teamStats[painTeam.id].losses = 3;
    teamStats[painTeam.id].pointsAgainst = 12;
  }

  // Haunt: 2W - 1L
  const hauntTeam = teams.find(t => t.name.toLowerCase() === 'haunt');
  if (hauntTeam && teamStats[hauntTeam.id]) {
    teamStats[hauntTeam.id].wins = 2;
    teamStats[hauntTeam.id].losses = 1;
    teamStats[hauntTeam.id].pointsFor = 8;
    teamStats[hauntTeam.id].pointsAgainst = 4;
  }

  // Shine: 0W - 1L
  const shineTeam = teams.find(t => t.name.toLowerCase() === 'shine');
  if (shineTeam && teamStats[shineTeam.id]) {
    teamStats[shineTeam.id].losses = 1;
    teamStats[shineTeam.id].pointsAgainst = 4;
  }

  // Desire: 0W - 1L
  const desireTeam = teams.find(t => t.name.toLowerCase() === 'desire');
  if (desireTeam && teamStats[desireTeam.id]) {
    teamStats[desireTeam.id].losses = 1;
    teamStats[desireTeam.id].pointsAgainst = 4;
  }

  // QURA / syndicate / quray: 1W - 1L
  const quraTeam = teams.find(t => t.name.toLowerCase().includes('qur') || t.name.toLowerCase().includes('syn'));
  if (quraTeam && teamStats[quraTeam.id]) {
    teamStats[quraTeam.id].wins = 1;
    teamStats[quraTeam.id].losses = 1;
    teamStats[quraTeam.id].pointsFor = 4;
    teamStats[quraTeam.id].pointsAgainst = 4;
  }

  // Parse all unique games
  const uniqueGames = new Set();
  messages.forEach(msg => {
    if (msg.embeds && msg.embeds.length > 0) {
      const embed = msg.embeds[0];
      const footer = embed.footer ? embed.footer.text : '';
      if (footer && footer.includes('score_ids:')) {
        const parts = footer.split(':');
        const t1Id = parts[1];
        const t2Id = parts[2];
        const s1 = parseInt(parts[3]);
        const s2 = parseInt(parts[4]);

        const gameKey = `${t1Id}-${t2Id}-${s1}-${s2}`;
        if (!uniqueGames.has(gameKey)) {
          uniqueGames.add(gameKey);

          if (teamStats[t1Id]) {
            teamStats[t1Id].pointsFor += s1;
            teamStats[t1Id].pointsAgainst += s2;
            if (s1 > s2) teamStats[t1Id].wins += 1;
            else if (s1 < s2) teamStats[t1Id].losses += 1;
            else teamStats[t1Id].ties += 1;
          }

          if (teamStats[t2Id]) {
            teamStats[t2Id].pointsFor += s2;
            teamStats[t2Id].pointsAgainst += s1;
            if (s2 > s1) teamStats[t2Id].wins += 1;
            else if (s2 < s1) teamStats[t2Id].losses += 1;
            else teamStats[t2Id].ties += 1;
          }
        }
      }
    }
  });

  // Apply to JSON DB
  const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
  const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');

  const teamsJson = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  teamsJson.forEach(t => {
    const stat = teamStats[t.id];
    if (stat) {
      t.wins = stat.wins;
      t.losses = stat.losses;
      t.ties = stat.ties;
      t.pointsFor = stat.pointsFor;
      t.pointsAgainst = stat.pointsAgainst;
    }
  });

  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teamsJson, null, 2), 'utf8');
  fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(teamsJson, null, 2), 'utf8');
  console.log('[SYNC] Successfully recalculated all team win/loss records from scores!');

  // Refresh power rankings message
  await updatePowerRankingsMessage(guild);

  console.log('[SYNC] Done!');
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
