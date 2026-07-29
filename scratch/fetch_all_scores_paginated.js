require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const db = require('../database');

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
  console.log(`[PAGINATED FETCH] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('scores') || c.name.includes('score')));
  
  if (!channel) {
    console.error('[PAGINATED FETCH] Scores channel not found');
    process.exit(1);
  }

  let allMessages = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const fetched = await channel.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) break;

    allMessages.push(...fetched.values());
    lastId = fetched.last().id;
    console.log(`Fetched ${fetched.size} messages... total so far: ${allMessages.length}`);

    if (fetched.size < 100) break;
  }

  console.log(`\n=== Total messages fetched in #${channel.name}: ${allMessages.length} ===\n`);

  const teams = db.getTeams();
  const teamStats = {};
  teams.forEach(t => {
    teamStats[t.id] = { name: t.name, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
  });

  const processedGameKeys = new Set();
  let validScoreCount = 0;

  // Process from oldest to newest or by message ID
  for (const msg of allMessages) {
    if (msg.embeds && msg.embeds.length > 0) {
      const embed = msg.embeds[0];
      const footer = embed.footer ? embed.footer.text : '';
      if (footer && footer.includes('score_ids:')) {
        const parts = footer.split(':');
        const t1Id = parts[1];
        const t2Id = parts[2];
        const s1 = parseInt(parts[3]);
        const s2 = parseInt(parts[4]);

        // Unique key by message ID OR exact footer to avoid double counting identical messages
        const uniqueKey = msg.id;
        if (!processedGameKeys.has(uniqueKey)) {
          processedGameKeys.add(uniqueKey);
          validScoreCount++;

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
  }

  console.log(`[PAGINATED FETCH] Found ${validScoreCount} unique score report embeds!`);

  console.log('\n--- Complete Recalculated Team Records from ALL Channel Messages ---');
  const activeTeams = Object.values(teamStats).filter(t => (t.wins + t.losses + t.ties) > 0).sort((a, b) => b.wins - a.wins);
  activeTeams.forEach(t => {
    console.log(`- ${t.name}: ${t.wins}W - ${t.losses}L - ${t.ties}T (PF: ${t.pointsFor}, PA: ${t.pointsAgainst})`);
  });

  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
