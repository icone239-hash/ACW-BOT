// utils/powerRankings.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const REF_PATH = path.join(__dirname, '../data/powerrankings_msg.json');
const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');

function readRef() {
  try {
    return JSON.parse(fs.readFileSync(REF_PATH, 'utf8'));
  } catch {
    return { channelId: null, messageId: null };
  }
}

function writeRef(data) {
  fs.writeFileSync(REF_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
}

const DIVISIONS_CONFIG = [
  {
    name: 'North Division (American Conference)',
    emoji: '❄️',
    color: '#00D2FF',
    badge: 'North'
  },
  {
    name: 'South Division (American Conference)',
    emoji: '🔥',
    color: '#FF4B2B',
    badge: 'South'
  },
  {
    name: 'Central Division (American Conference)',
    emoji: '⚡',
    color: '#F7B731',
    badge: 'Central'
  },
  {
    name: 'Gulf Division (American Conference)',
    emoji: '🌊',
    color: '#05C46B',
    badge: 'Gulf'
  }
];

const DIVISIONS = DIVISIONS_CONFIG.map(d => d.name);

/**
 * User Formula:
 * Power Score = (Wins × 10) + (Win Percentage × 100) − (Losses × 2)
 * Win Percentage = Wins ÷ (Wins + Losses)
 * Unplayed teams rank below all played teams.
 */
function getPowerRankScore(team) {
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const gamesPlayed = wins + losses;
  if (gamesPlayed === 0) return -999;

  const winPercentage = (wins / gamesPlayed) * 100;
  return (wins * 10) + winPercentage - (losses * 2);
}

function sortTeams(a, b) {
  const aPlayed = ((a.wins || 0) + (a.losses || 0)) > 0 ? 1 : 0;
  const bPlayed = ((b.wins || 0) + (b.losses || 0)) > 0 ? 1 : 0;
  if (bPlayed !== aPlayed) return bPlayed - aPlayed;

  const aScore = getPowerRankScore(a);
  const bScore = getPowerRankScore(b);
  if (bScore !== aScore) return bScore - aScore;

  // Tiebreaker 1: Total Wins
  if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);

  // Tiebreaker 2: Fewest Losses
  if ((a.losses || 0) !== (b.losses || 0)) return (a.losses || 0) - (b.losses || 0);

  // Tiebreaker 3: Point Differential
  const aDiff = (a.pointsFor || 0) - (a.pointsAgainst || 0);
  const bDiff = (b.pointsFor || 0) - (b.pointsAgainst || 0);
  return bDiff - aDiff;
}

function balanceAllDivisionsEvenly() {
  const teams = db.getTeams();
  const crewList = readCrewList();
  if (crewList.length === 0) return;

  const mapped = crewList.map(c => {
    let dbTeam = teams.find(t => t.name.toLowerCase() === c.team.toLowerCase() || (c.roleId && t.roleId === c.roleId));
    if (!dbTeam) {
      dbTeam = db.createTeam({
        name: c.team,
        abbreviation: c.team.substring(0, 4).toUpperCase(),
        roleId: c.roleId || '',
        wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0
      });
    }
    return dbTeam;
  });

  const divBuckets = {};
  DIVISIONS.forEach(d => divBuckets[d] = []);
  const unassigned = [];

  mapped.forEach(t => {
    if (t.division && DIVISIONS.includes(t.division)) {
      divBuckets[t.division].push(t);
    } else {
      unassigned.push(t);
    }
  });

  const total = mapped.length;
  const maxPerDiv = Math.ceil(total / DIVISIONS.length);
  const minPerDiv = Math.floor(total / DIVISIONS.length);

  // Trim overflow
  DIVISIONS.forEach(d => {
    while (divBuckets[d].length > maxPerDiv) {
      unassigned.push(divBuckets[d].pop());
    }
  });

  // Fill underflow
  DIVISIONS.forEach(d => {
    while (divBuckets[d].length < minPerDiv && unassigned.length > 0) {
      const t = unassigned.shift();
      divBuckets[d].push(t);
    }
  });

  // Distribute remaining
  while (unassigned.length > 0) {
    const sortedDivs = DIVISIONS.slice().sort((a, b) => divBuckets[a].length - divBuckets[b].length);
    const chosen = sortedDivs[0];
    const t = unassigned.shift();
    divBuckets[chosen].push(t);
  }

  // Update DB
  DIVISIONS.forEach(d => {
    divBuckets[d].forEach(t => {
      db.updateTeamDivision(t.id, d);
    });
  });
}

function randomizeTeamDivisions() {
  const crewList = readCrewList();
  if (crewList.length === 0) return;

  const teams = db.getTeams();

  // Shuffle crewList array randomly (Fisher-Yates)
  const shuffled = [...crewList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Assign divisions evenly to database teams
  shuffled.forEach((c, i) => {
    const div = DIVISIONS[i % DIVISIONS.length];
    const dbTeam = teams.find(t => t.name.toLowerCase() === c.team.toLowerCase() || (c.roleId && t.roleId === c.roleId));
    if (dbTeam) {
      db.updateTeamDivision(dbTeam.id, div);
    }
  });
}

async function updatePowerRankingsMessage(guild) {
  // Find the power rankings channel
  const channel = guild.channels.cache.find(
    c => c.isTextBased() && (c.name.includes('power-rankings') || c.name.includes('powerrankings'))
  );

  if (!channel) {
    console.warn('[PowerRankings] Power rankings channel not found.');
    return;
  }

  await guild.roles.fetch().catch(() => {});
  const crewList = readCrewList();
  const teams = db.getTeams();

  // Map every single crew in crewList to its DB record
  const allCrews = crewList.map(c => {
    const dbTeam = teams.find(t => t.name.toLowerCase() === c.team.toLowerCase() || (c.roleId && t.roleId === c.roleId));
    return {
      name: c.team,
      roleId: c.roleId || (dbTeam ? dbTeam.roleId : ''),
      wins: dbTeam ? (dbTeam.wins || 0) : 0,
      losses: dbTeam ? (dbTeam.losses || 0) : 0,
      ties: dbTeam ? (dbTeam.ties || 0) : 0,
      pointsFor: dbTeam ? (dbTeam.pointsFor || 0) : 0,
      pointsAgainst: dbTeam ? (dbTeam.pointsAgainst || 0) : 0,
      division: dbTeam ? dbTeam.division : (c.division || null)
    };
  });

  // Ensure all divisions have an even distribution of teams (10-11 teams each)
  balanceAllDivisionsEvenly();
  const refreshedTeams = db.getTeams();
  allCrews.forEach(c => {
    const dbTeam = refreshedTeams.find(t => t.name.toLowerCase() === c.name.toLowerCase() || (c.roleId && t.roleId === c.roleId));
    if (dbTeam && dbTeam.division) {
      c.division = dbTeam.division;
    }
  });

  // Find overall Rank 1 team for the ping text (formula score)
  const sortedOverall = [...allCrews].sort(sortTeams);

  const rank1Team = sortedOverall[0];
  const rank1Mention = (rank1Team && rank1Team.roleId && guild.roles.cache.has(rank1Team.roleId))
    ? `<@&${rank1Team.roleId}>`
    : `**${rank1Team?.name || 'Nobody'}**`;
  const preseasonRole = guild.roles.cache.find(r => r.name.includes('Preseason Champs'));
  const champsMention = preseasonRole ? `<@&${preseasonRole.id}>` : '**Preseason Champs**';

  // Check if transactions/regular season are closed for Playoffs
  const { areTransactionsOpen } = require('./transactionsHelper');
  const isClosed = !areTransactionsOpen();

  const contentText = isClosed
    ? `@everyone 🔒 **OFFICIAL ACW S1 DIVISION POWER RANKINGS — FROZEN FOR PLAYOFFS**\n🏆 *The Regular Season has ended. Power Rankings and standings are frozen for the Playoffs!*`
    : `@everyone 🏆 **OFFICIAL ACW S1 DIVISION POWER RANKINGS**\n🎟️ *The Top 3 crews from each division make the Playoffs!*\n\n${rank1Mention} is currently holding overall #1 looking to claim the ${champsMention} title! Can anyone overcome them?`;

  const divisionEmbeds = [];

  for (const divConf of DIVISIONS_CONFIG) {
    const divTeams = allCrews.filter(t => t.division === divConf.name);

    // Sort by Formula Score: (Win % * 100) + (Games Played * 2)
    divTeams.sort(sortTeams);

    let descLines = [];
    const TOTAL_SLOTS = Math.max(9, divTeams.length);

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const slotNum = i + 1;

      // Add a visual playoff boundary line after rank 3
      if (slotNum === 4) {
        descLines.push('─────────────────────');
      }

      if (i < divTeams.length) {
        const team = divTeams[i];
        let role = null;
        if (team.roleId && guild.roles.cache.has(team.roleId)) {
          role = guild.roles.cache.get(team.roleId);
        } else if (team.name) {
          const cleanName = team.name.replace(/^<@&|\d+>$/g, '').trim();
          role = guild.roles.cache.find(r => r.name.toLowerCase() === cleanName.toLowerCase() || r.name.toLowerCase() === team.name.toLowerCase());
        }
        const teamMention = role ? `<@&${role.id}>` : `**${team.name}**`;
        const hasGames = (team.wins + team.losses + team.ties) > 0;
        const scoreStr = hasGames ? `**${team.wins}W - ${team.losses}L**` : 'No games';
        
        let rankIcon = '🔹';
        let playoffBadge = '';
        if (slotNum === 1) {
          rankIcon = '👑';
          playoffBadge = ' 🎟️';
        } else if (slotNum === 2) {
          rankIcon = '🥇';
          playoffBadge = ' 🎟️';
        } else if (slotNum === 3) {
          rankIcon = '🥈';
          playoffBadge = ' 🎟️';
        }

        descLines.push(`${rankIcon} **${slotNum}.** ${teamMention} — ${scoreStr}${playoffBadge}`);
      } else {
        descLines.push(`▫️ **${slotNum}.** TBD`);
      }
    }

    const divEmbed = new EmbedBuilder()
      .setColor(divConf.color)
      .setTitle(`${divConf.emoji} ${divConf.name}`)
      .setDescription(descLines.join('\n'))
      .setFooter({ text: `${guild.name} • Formula: (Wins × 10) + Win% − (Losses × 2) • Top 3 Qualify 🎟️`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    divisionEmbeds.push(divEmbed);
  }

  const ref = readRef();

  // Purge any extra duplicate bot messages in power-rankings channel
  const fetchedMessages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  if (fetchedMessages && fetchedMessages.size > 0) {
    const botMessages = fetchedMessages.filter(m => m.author.id === guild.client.user.id);
    if (ref.channelId === channel.id && ref.messageId) {
      const existing = botMessages.get(ref.messageId) || await channel.messages.fetch(ref.messageId).catch(() => null);
      if (existing) {
        for (const [id, msg] of botMessages) {
          if (id !== ref.messageId) {
            await msg.delete().catch(() => {});
          }
        }
        await existing.edit({
          content: contentText,
          embeds: divisionEmbeds
        });
        console.log('[PowerRankings] Updated single master Power Rankings message.');
        return;
      }
    }

    for (const [id, msg] of botMessages) {
      await msg.delete().catch(() => {});
    }
  }

  try {
    const newMsg = await channel.send({
      content: contentText,
      embeds: divisionEmbeds
    });
    writeRef({ channelId: channel.id, messageId: newMsg.id });
    console.log('[PowerRankings] Posted single new Power Rankings message.');
  } catch (err) {
    console.error('[PowerRankings] Error updating message:', err);
  }
}

module.exports = { updatePowerRankingsMessage, randomizeTeamDivisions, DIVISIONS };
