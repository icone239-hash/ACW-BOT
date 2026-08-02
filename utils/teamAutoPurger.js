// utils/teamAutoPurger.js
// Automatically purges teams from crewlist.json, teams.json, and player records when a Discord team role is deleted.

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
const INIT_CREWLIST_PATH = path.join(__dirname, '../data_init/crewlist.json');
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');
const PLAYERS_PATH = path.join(__dirname, '../data/players.json');
const INIT_PLAYERS_PATH = path.join(__dirname, '../data_init/players.json');

/**
 * Purges a team by roleId or teamName from crewlist.json, teams.json, and clears player team assignments.
 * Refreshes live #crew-list and #power-rankings embeds and posts notice in #transactions.
 */
async function purgeTeamByRoleOrName(guild, { roleId, teamName, reason = 'Discord role deleted' }) {
  if (!guild) return false;

  let crewList = [];
  try { crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); } catch {}

  let teams = [];
  try { teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8')); } catch {}

  let players = [];
  try { players = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8')); } catch {}

  // Match crew entry
  const crewIdx = crewList.findIndex(c => 
    (roleId && c.roleId === roleId) || 
    (teamName && c.team.toLowerCase().trim() === teamName.toLowerCase().trim())
  );

  // Match team entry in DB
  const teamIdx = teams.findIndex(t => 
    (roleId && t.roleId === roleId) || 
    (teamName && t.name.toLowerCase().trim() === teamName.toLowerCase().trim())
  );

  if (crewIdx < 0 && teamIdx < 0) return false;

  const targetName = (crewIdx >= 0 ? crewList[crewIdx].team : (teamIdx >= 0 ? teams[teamIdx].name : teamName)) || 'Unknown';
  const targetDbTeam = teamIdx >= 0 ? teams[teamIdx] : null;

  console.log(`[TEAM AUTO-PURGE] Purging team "${targetName}" (Role ID: ${roleId || 'N/A'}) - Reason: ${reason}`);

  // 1. Remove from crewlist
  if (crewIdx >= 0) {
    crewList.splice(crewIdx, 1);
    fs.writeFileSync(CREWLIST_PATH, JSON.stringify(crewList, null, 2), 'utf8');
    if (fs.existsSync(path.dirname(INIT_CREWLIST_PATH))) {
      fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(crewList, null, 2), 'utf8');
    }
  }

  // 2. Remove from teams.json
  if (teamIdx >= 0) {
    teams.splice(teamIdx, 1);
    fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
    if (fs.existsSync(path.dirname(INIT_TEAMS_PATH))) {
      fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
    }
  }

  // 3. Unassign signed players for this team in players.json
  if (targetDbTeam) {
    let playersChanged = false;
    players.forEach(p => {
      if (p.teamId === targetDbTeam.id) {
        p.teamId = null;
        p.position = 'N/A';
        playersChanged = true;
      }
    });
    if (playersChanged) {
      fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players, null, 2), 'utf8');
      if (fs.existsSync(path.dirname(INIT_PLAYERS_PATH))) {
        fs.writeFileSync(INIT_PLAYERS_PATH, JSON.stringify(players, null, 2), 'utf8');
      }
    }
  }

  // 4. Update embeds
  const { updateCrewListMessage } = require('./crewListMessage');
  const { updatePowerRankingsMessage } = require('./powerRankings');

  await updateCrewListMessage(guild).catch(console.error);
  await updatePowerRankingsMessage(guild).catch(console.error);

  // 5. Post announcement embed in #transactions channel
  const transactionsChannel = guild.channels.cache.get(config.channels?.transactions) ||
                               guild.channels.cache.get('1525998986215821382') ||
                               guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')));

  if (transactionsChannel) {
    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('🗑️ Team Auto-Removed')
      .setDescription(`**${targetName}** was automatically removed from the crew list and database because its Discord role was deleted.`)
      .addFields({ name: 'Role ID', value: roleId || 'N/A', inline: true })
      .setTimestamp();

    await transactionsChannel.send({ embeds: [embed] }).catch(console.error);
  }

  return true;
}

/**
 * Startup audit check to ensure all crews in crewlist.json have an existing role in Discord.
 * If a crew's role was deleted while bot was offline, auto-purge it.
 */
async function auditAndPurgeDeletedTeamRoles(guild) {
  if (!guild) return;

  try {
    await guild.roles.fetch().catch(() => {});

    let crewList = [];
    try { crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); } catch { return; }

    for (const entry of crewList) {
      if (!entry.roleId && !entry.team) continue;

      let role = entry.roleId ? guild.roles.cache.get(entry.roleId) : null;
      if (!role && entry.team) {
        role = guild.roles.cache.find(r => r.name.toLowerCase().trim() === entry.team.toLowerCase().trim());
      }

      if (!role) {
        console.log(`[AUDIT AUTO-PURGE] Team "${entry.team}" role (ID: ${entry.roleId}) no longer exists on Discord. Purging...`);
        await purgeTeamByRoleOrName(guild, {
          roleId: entry.roleId,
          teamName: entry.team,
          reason: 'Role missing during startup audit'
        });
      }
    }
  } catch (err) {
    console.error('[AUDIT AUTO-PURGE] Error:', err);
  }
}

module.exports = { purgeTeamByRoleOrName, auditAndPurgeDeletedTeamRoles };
