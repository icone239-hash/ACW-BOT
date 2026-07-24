const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'config.json');

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function hasAdminPerm(member) {
  if (!member) return false;
  if (member.guild && member.guild.ownerId === member.id) return true;
  if (member.user && member.guild && member.guild.ownerId === member.user.id) return true;

  try {
    if (member.permissions) {
      const bitfield = typeof member.permissions === 'string' || typeof member.permissions === 'bigint'
        ? new PermissionsBitField(BigInt(member.permissions))
        : (member.permissions instanceof PermissionsBitField ? member.permissions : new PermissionsBitField(member.permissions));

      if (bitfield.has(PermissionFlagsBits.Administrator)) return true;
    }
  } catch (err) {
    console.error('[permissions] Error checking bitfield:', err);
  }

  return false;
}

function isAdmin(member) {
  if (!member) return false;
  if (hasAdminPerm(member)) return true;

  const config = getConfig();
  const roles = [...(config.adminRoles || []), ...(config.superAdminRoles || [])];
  
  if (member.roles && member.roles.cache) {
    return member.roles.cache.some(r => roles.includes(r.id));
  } else if (Array.isArray(member.roles)) {
    return member.roles.some(r => roles.includes(typeof r === 'string' ? r : r.id));
  }
  return false;
}

function isSuperAdmin(member) {
  if (!member) return false;
  if (hasAdminPerm(member)) return true;

  const config = getConfig();
  const roles = config.superAdminRoles || [];

  if (member.roles && member.roles.cache) {
    return member.roles.cache.some(r => roles.includes(r.id));
  } else if (Array.isArray(member.roles)) {
    return member.roles.some(r => roles.includes(typeof r === 'string' ? r : r.id));
  }
  return false;
}

function getUserTeam(member) {
  if (!member) return null;
  const db = require('../database');
  const teams = db.getTeams();
  const memberId = member.id || (member.user && member.user.id);

  let userRoleIds = [];
  let userRoleNames = [];

  if (member.roles) {
    if (member.roles.cache) {
      const rolesArr = Array.from(member.roles.cache.values());
      userRoleIds = rolesArr.map(r => typeof r === 'string' ? r : (r.id || r));
      userRoleNames = rolesArr.map(r => typeof r === 'object' && r.name ? r.name.toLowerCase() : '').filter(Boolean);
    } else if (Array.isArray(member.roles)) {
      userRoleIds = member.roles.map(r => typeof r === 'string' ? r : (r.id || r));
      if (member.guild && member.guild.roles && member.guild.roles.cache) {
        userRoleNames = userRoleIds
          .map(id => member.guild.roles.cache.get(id))
          .filter(Boolean)
          .map(r => r.name.toLowerCase());
      }
    }
  }

  // 1. Direct role match against DB teams (roleId or role name)
  for (const t of teams) {
    if (
      (t.roleId && userRoleIds.includes(t.roleId)) ||
      (t.name && userRoleNames.includes(t.name.toLowerCase()))
    ) {
      return t;
    }
  }

  // 2. Check crewlist.json for matching role OR matching team name on user's roles
  let crewList = [];
  try {
    const crewlistPath = path.join(__dirname, '../data/crewlist.json');
    if (fs.existsSync(crewlistPath)) {
      crewList = JSON.parse(fs.readFileSync(crewlistPath, 'utf8'));
    }
  } catch (e) {}

  for (const entry of crewList) {
    if (!entry.team) continue;
    const entryTeamLower = entry.team.toLowerCase();
    
    if (
      (entry.roleId && userRoleIds.includes(entry.roleId)) ||
      userRoleNames.includes(entryTeamLower)
    ) {
      let team = teams.find(t => t.name.toLowerCase() === entryTeamLower || (entry.roleId && t.roleId === entry.roleId));
      if (!team) {
        team = db.createTeam({
          name: entry.team,
          abbreviation: entry.team.substring(0, 4).toUpperCase(),
          roleId: entry.roleId || '',
          wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0
        });
      } else if (!team.roleId && entry.roleId) {
        team.roleId = entry.roleId;
        db.updateTeam(team);
      }
      return team;
    }
  }

  // 3. Check crewlist.json for ownerId matching user
  if (memberId) {
    const crewEntry = crewList.find(e => e.ownerId === memberId);
    if (crewEntry && crewEntry.team) {
      let team = teams.find(t => t.name.toLowerCase() === crewEntry.team.toLowerCase() || (crewEntry.roleId && t.roleId === crewEntry.roleId));
      if (!team) {
        team = db.createTeam({
          name: crewEntry.team,
          abbreviation: crewEntry.team.substring(0, 4).toUpperCase(),
          roleId: crewEntry.roleId || '',
          wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0
        });
      }
      return team;
    }
  }

  // 4. Check DB players table
  if (memberId) {
    const player = db.getPlayer(memberId);
    if (player && player.teamId) {
      const team = db.getTeamById(player.teamId);
      if (team) return team;
    }
  }

  return null;
}

module.exports = { isAdmin, isSuperAdmin, getConfig, getUserTeam };

