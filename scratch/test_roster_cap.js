const db = require('../database');
const fs = require('fs');
const path = require('path');

const teams = db.getTeams();
const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));

console.log('--- Checking Roster Counts Across All Teams ---');
let fullCount = 0;
teams.forEach(t => {
  const dbPlayers = db.getTeamPlayers(t.id);
  const crewEntry = crewList.find(c => c.team.toLowerCase() === t.name.toLowerCase());
  
  const allIds = new Set(dbPlayers.map(p => p.discordId || String(p.id)));
  if (crewEntry?.ownerId) allIds.add(crewEntry.ownerId);

  if (allIds.size >= 10) {
    console.log(`[FULL ROSTER] Team "${t.name}" has ${allIds.size}/10 members.`);
    fullCount++;
  }
});

console.log(`Total teams at or exceeding 10 player cap: ${fullCount}`);
