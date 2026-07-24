const db = require('../database');
const fs = require('fs');
const path = require('path');

function getUserTeam(member) {
  if (!member) return null;
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

// Test with mock member having PowerRangers role
const mockMember = {
  id: '123456789',
  roles: {
    cache: new Map([
      ['1530080223964565544', { id: '1530080223964565544', name: 'PowerRangers' }],
      ['1525999578057539614', { id: '1525999578057539614', name: 'Crew Owner' }]
    ])
  }
};

console.log('Detected team:', getUserTeam(mockMember));
