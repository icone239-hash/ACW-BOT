const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// JSON file paths
const FILES = {
  teams: path.join(DATA_DIR, 'teams.json'),
  players: path.join(DATA_DIR, 'players.json'),
  games: path.join(DATA_DIR, 'games.json'),
  strikes: path.join(DATA_DIR, 'strikes.json'),
};

// Initialize empty files if they don't exist
for (const [, filepath] of Object.entries(FILES)) {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify([]), 'utf8');
  }
}

// Sync teams from crewlist.json to teams.json if they are missing or roleId is missing
try {
  const crewlistPath = path.join(DATA_DIR, 'crewlist.json');
  if (fs.existsSync(crewlistPath)) {
    const crewList = JSON.parse(fs.readFileSync(crewlistPath, 'utf8'));
    const teams = JSON.parse(fs.readFileSync(FILES.teams, 'utf8'));
    let updated = false;
    
    for (const entry of crewList) {
      if (entry.team) {
        const existingTeam = teams.find(t => t.name.toLowerCase() === entry.team.toLowerCase() || (entry.roleId && t.roleId === entry.roleId));
        if (existingTeam) {
          if (entry.roleId && !existingTeam.roleId) {
            existingTeam.roleId = entry.roleId;
            updated = true;
            console.log(`[DB SYNC] Updated roleId for team: ${entry.team}`);
          }
        } else {
          const newId = teams.length === 0 ? 1 : Math.max(...teams.map(x => x.id)) + 1;
          teams.push({
            id: newId,
            name: entry.team,
            abbreviation: entry.team.substring(0, 4).toUpperCase(),
            logo: '',
            roleId: entry.roleId || '',
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            createdAt: new Date().toISOString()
          });
          updated = true;
          console.log(`[DB SYNC] Auto-created missing team in database: ${entry.team}`);
        }
      }
    }
    if (updated) {
      fs.writeFileSync(FILES.teams, JSON.stringify(teams, null, 2), 'utf8');
    }
  }
} catch (err) {
  console.error('[DB SYNC] Error syncing teams:', err);
}

// --- Helpers ---
function read(file) {
  return JSON.parse(fs.readFileSync(FILES[file], 'utf8'));
}

function write(file, data) {
  fs.writeFileSync(FILES[file], JSON.stringify(data, null, 2), 'utf8');
}

function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// =====================
// TEAMS
// =====================
function getTeams() { return read('teams'); }

function getTeam(name) {
  return read('teams').find(t => t.name.toLowerCase() === name.toLowerCase());
}

function getTeamById(id) {
  return read('teams').find(t => t.id === id);
}

function createTeam({ name, abbreviation = '', logo = '', roleId = '', color = '', color2 = '' }) {
  const teams = read('teams');
  if (teams.find(t => t.name.toLowerCase() === name.toLowerCase())) return null;
  const team = { 
    id: nextId(teams), 
    name, 
    abbreviation, 
    logo, 
    roleId,
    color,
    color2,
    wins: 0, 
    losses: 0, 
    ties: 0, 
    pointsFor: 0, 
    pointsAgainst: 0, 
    createdAt: new Date().toISOString() 
  };
  teams.push(team);
  write('teams', teams);
  return team;
}

function deleteTeam(name) {
  let teams = read('teams');
  const idx = teams.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return false;
  const id = teams[idx].id;
  teams.splice(idx, 1);
  write('teams', teams);
  // Free players from this team
  const players = read('players').map(p => p.teamId === id ? { ...p, teamId: null } : p);
  write('players', players);
  return true;
}

function renameTeam(oldName, newName) {
  const teams = read('teams');
  const team = teams.find(t => t.name.toLowerCase() === oldName.toLowerCase());
  if (!team) return false;
  if (teams.find(t => t.name.toLowerCase() === newName.toLowerCase())) return false;
  team.name = newName;
  write('teams', teams);
  return true;
}

function updateTeamColors(id, color, color2) {
  const teams = read('teams');
  const team = teams.find(t => t.id === id);
  if (!team) return false;
  if (color !== undefined && color !== null) team.color = color;
  if (color2 !== undefined && color2 !== null) team.color2 = color2;
  write('teams', teams);
  return true;
}

function updateTeamDivision(identifier, division) {
  const teams = read('teams');
  const team = teams.find(t => t.id === identifier || t.name.toLowerCase() === String(identifier).toLowerCase() || t.roleId === identifier);
  if (!team) return false;
  team.division = division;
  write('teams', teams);
  return true;
}

function updateTeamRecord(id, { wins = 0, losses = 0, ties = 0, pointsFor = 0, pointsAgainst = 0 }) {
  const teams = read('teams');
  const team = teams.find(t => t.id === id);
  if (!team) return false;
  team.wins += wins;
  team.losses += losses;
  team.ties += ties;
  team.pointsFor += pointsFor;
  team.pointsAgainst += pointsAgainst;
  write('teams', teams);
  return true;
}

// =====================
// PLAYERS
// =====================
function getPlayers() { return read('players'); }

function getPlayer(discordId) {
  return read('players').find(p => p.discordId === discordId);
}

function getTeamPlayers(teamId) {
  return read('players').filter(p => String(p.teamId) === String(teamId));
}

function getFreeAgents() {
  return read('players').filter(p => !p.teamId);
}

function addPlayer({ discordId, username, teamId = null, position = '' }) {
  const players = read('players');
  const existing = players.find(p => p.discordId === discordId);
  if (existing) {
    existing.teamId = teamId;
    existing.username = username;
    if (position) existing.position = position;
    write('players', players);
    return existing;
  }
  const player = { id: nextId(players), discordId, username, teamId, position, touchdowns: 0, catches: 0, yards: 0, interceptions: 0, sacks: 0, joinedAt: new Date().toISOString() };
  players.push(player);
  write('players', players);
  return player;
}

function removePlayerFromTeam(discordId) {
  const players = read('players');
  const player = players.find(p => p.discordId === discordId);
  if (!player) return false;
  player.teamId = null;
  write('players', players);
  return true;
}

function transferPlayer(discordId, newTeamId) {
  const players = read('players');
  const player = players.find(p => p.discordId === discordId);
  if (!player) return false;
  player.teamId = newTeamId;
  write('players', players);
  return true;
}

function updatePlayerStats(discordId, stats) {
  const players = read('players');
  const player = players.find(p => p.discordId === discordId);
  if (!player) return false;
  for (const [key, val] of Object.entries(stats)) {
    if (player[key] !== undefined) player[key] += val;
  }
  write('players', players);
  return true;
}

// =====================
// GAMES
// =====================
function getGames() { return read('games'); }

function getGame(id) {
  return read('games').find(g => g.id === id);
}

function scheduleGame({ team1Id, team2Id, scheduledAt }) {
  const games = read('games');
  const game = { id: nextId(games), team1Id, team2Id, team1Score: null, team2Score: null, scheduledAt, playedAt: null, status: 'scheduled', createdAt: new Date().toISOString() };
  games.push(game);
  write('games', games);
  return game;
}

function recordGameResult(gameId, team1Score, team2Score) {
  const games = read('games');
  const game = games.find(g => g.id === gameId);
  if (!game) return null;
  game.team1Score = team1Score;
  game.team2Score = team2Score;
  game.status = 'completed';
  game.playedAt = new Date().toISOString();
  write('games', games);
  return game;
}

function cancelGame(gameId) {
  const games = read('games');
  const game = games.find(g => g.id === gameId);
  if (!game) return false;
  game.status = 'cancelled';
  write('games', games);
  return true;
}

// =====================
// STRIKES
// =====================
function getStrikes() { return read('strikes'); }

function getUserStrikes(discordId) {
  return read('strikes').filter(s => s.discordId === discordId);
}

function addStrike({ discordId, username, reason, issuedBy }) {
  const strikes = read('strikes');
  const strike = { id: nextId(strikes), discordId, username, reason, issuedBy, createdAt: new Date().toISOString() };
  strikes.push(strike);
  write('strikes', strikes);
  return strike;
}

function clearLastStrike(discordId) {
  const strikes = read('strikes');
  const userStrikes = strikes.filter(s => s.discordId === discordId);
  if (userStrikes.length === 0) return false;
  const last = userStrikes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const idx = strikes.findIndex(s => s.id === last.id);
  strikes.splice(idx, 1);
  write('strikes', strikes);
  return true;
}

function clearUserStrikes(discordId) {
  let strikes = read('strikes');
  const count = strikes.filter(s => s.discordId === discordId).length;
  strikes = strikes.filter(s => s.discordId !== discordId);
  write('strikes', strikes);
  return count;
}

function clearAllStrikes() {
  const count = read('strikes').length;
  write('strikes', []);
  return count;
}

module.exports = {
  // Teams
  getTeams, getTeam, getTeamById, createTeam, deleteTeam, renameTeam, updateTeamColors, updateTeamDivision, updateTeamRecord,
  // Players
  getPlayers, getPlayer, getTeamPlayers, getFreeAgents, addPlayer, removePlayerFromTeam, transferPlayer, updatePlayerStats,
  // Games
  getGames, getGame, scheduleGame, recordGameResult, cancelGame,
  // Strikes
  getStrikes, getUserStrikes, addStrike, clearLastStrike, clearUserStrikes, clearAllStrikes,
};
