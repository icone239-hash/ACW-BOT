// utils/autoRoleSync.js
// Automatically detects new team roles created manually in Discord settings and syncs them to crewlist.json & teams.json.

const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
const INIT_CREWLIST_PATH = path.join(__dirname, '../data_init/crewlist.json');
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');

function isSystemOrUtilityRole(nameLower) {
  const systemKeywords = [
    'admin', 'mod', 'owner', 'staff', 'booster', 'bot', 'free agent', 'fa',
    'suspended', 'suspension', 'strike', 'ticket', 'community', 'verified',
    'unverified', 'members', 'level', 'award', 'pro', 'mvp', 'rpoy', 'opoy',
    'wroy', 'all-pro', 'champs', 'stage', 'preseason', 'regular season', 'league'
  ];
  return systemKeywords.some(k => nameLower.includes(k)) || nameLower.startsWith('═') || nameLower.startsWith('—');
}

async function syncDiscordRolesToCrewList(guild) {
  if (!guild) return false;

  try {
    await guild.roles.fetch().catch(() => {});
    await guild.members.fetch().catch(() => {});

    let crewList = [];
    try { crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); } catch {}

    let teams = [];
    try { teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8')); } catch {}

    const registeredRoleIds = new Set(crewList.map(c => c.roleId).filter(Boolean));
    const registeredNames = new Set(crewList.map(c => c.team.toLowerCase().trim()));

    let addedCount = 0;

    guild.roles.cache.forEach(role => {
      if (role.name === '@everyone' || role.managed) return;
      const nameLower = role.name.toLowerCase().trim();

      if (isSystemOrUtilityRole(nameLower)) return;

      if (!registeredRoleIds.has(role.id) && !registeredNames.has(nameLower)) {
        function isOwnerRoleName(name) {
          const n = name.toLowerCase().trim();
          return n === 'crew owner' || n === 'owner' || n.includes('franchise owner') || n === 'fo' || n === 'co-fo' || n.includes('pcw owner');
        }

        // Detect owner member (member holding Crew Owner / Owner role)
        let ownerMember = null;
        role.members.forEach(m => {
          const hasOwnerRole = m.roles.cache.some(r => isOwnerRoleName(r.name));
          if (hasOwnerRole && !ownerMember) ownerMember = m;
        });

        // REQUIRE a member with a Crew Owner role to be present
        if (!ownerMember) return;

        const ownerId = ownerMember.user.id;
        const ownerTag = `<@${ownerMember.user.id}>`;

        // 1. Add to crewlist.json
        crewList.push({
          team: role.name,
          roleId: role.id,
          ownerTag: ownerTag,
          ownerId: ownerId,
          color: role.hexColor || '#ED4245'
        });

        // 2. Add to teams.json
        const maxId = teams.length > 0 ? Math.max(...teams.map(t => t.id || 0)) : 0;
        teams.push({
          id: maxId + 1,
          name: role.name,
          abbreviation: role.name.substring(0, 4).toUpperCase(),
          logo: '',
          roleId: role.id,
          color: role.hexColor || '#ED4245',
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          createdAt: new Date().toISOString()
        });

        registeredRoleIds.add(role.id);
        registeredNames.add(nameLower);
        addedCount++;
        console.log(`[AUTO ROLE SYNC] Automatically added new crew "${role.name}" (ID: ${role.id}) owned by ${ownerTag}`);
      }
    });

    if (addedCount > 0) {
      fs.writeFileSync(CREWLIST_PATH, JSON.stringify(crewList, null, 2), 'utf8');
      if (fs.existsSync(path.dirname(INIT_CREWLIST_PATH))) {
        fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(crewList, null, 2), 'utf8');
      }

      fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
      if (fs.existsSync(path.dirname(INIT_TEAMS_PATH))) {
        fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
      }

      const { updateCrewListMessage } = require('./crewListMessage');
      const { updatePowerRankingsMessage } = require('./powerRankings');

      await updateCrewListMessage(guild).catch(console.error);
      await updatePowerRankingsMessage(guild).catch(console.error);
      console.log(`[AUTO ROLE SYNC] Refreshed embeds after adding ${addedCount} new crews.`);
      return true;
    }

  } catch (err) {
    console.error('[AUTO ROLE SYNC] Error syncing Discord roles:', err);
  }
  return false;
}

module.exports = { syncDiscordRolesToCrewList };
