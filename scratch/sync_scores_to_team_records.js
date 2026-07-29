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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', async () => {
  console.log(`[SCORE SYNC] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (!guild) {
    console.error('[SCORE SYNC] Guild not found');
    process.exit(1);
  }

  const scoresChannel = guild.channels.cache.find(
    c => c.isTextBased() && (c.name.includes('scores') || c.name.includes('score'))
  );

  if (!scoresChannel) {
    console.error('[SCORE SYNC] Scores channel not found');
    process.exit(1);
  }

  console.log(`[SCORE SYNC] Fetching scores from channel #${scoresChannel.name}...`);
  const messages = await scoresChannel.messages.fetch({ limit: 100 }).catch(() => null);
  
  if (!messages || messages.size === 0) {
    console.log('[SCORE SYNC] No score messages found.');
    client.destroy();
    process.exit(0);
  }

  // Reset all team records in DB first
  const teams = db.getTeams();
  const teamStats = {};
  teams.forEach(t => {
    teamStats[t.id] = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
  });

  let parsedCount = 0;

  messages.forEach(msg => {
    if (msg.embeds && msg.embeds.length > 0) {
      const embed = msg.embeds[0];
      const footerText = embed.footer ? embed.footer.text : '';

      // Check footer format: score_ids:team1Id:team2Id:score1:score2
      if (footerText && footerText.includes('score_ids:')) {
        const match = footerText.match(/score_ids:([^:]+):([^:]+):(\d+):(\d+)/);
        if (match) {
          const [, t1Id, t2Id, s1Str, s2Str] = match;
          const s1 = parseInt(s1Str);
          const s2 = parseInt(s2Str);

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

          parsedCount++;
        }
      }
    }
  });

  console.log(`[SCORE SYNC] Parsed ${parsedCount} score reports from #${scoresChannel.name}`);

  // Apply stats to DB
  teams.forEach(t => {
    const stat = teamStats[t.id];
    if (stat) {
      db.updateTeamRecord(t.id, stat);
    }
  });

  // Copy to data_init
  const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
  const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');
  fs.copyFileSync(TEAMS_PATH, INIT_TEAMS_PATH);

  // Update Power Rankings Embed
  await updatePowerRankingsMessage(guild);

  console.log('[SCORE SYNC] Successfully updated team records and Power Rankings!');
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
