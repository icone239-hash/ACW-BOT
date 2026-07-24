// scratch/diagnose_hax.js
const db = require('../database');
const fs = require('fs');
const path = require('path');

const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));

const haxTeam = db.getTeams().find(t => t.name.toLowerCase() === 'hax');
console.log('--- HAX DB Team ---');
console.log(JSON.stringify(haxTeam, null, 2));

if (haxTeam) {
  const players = db.getTeamPlayers(haxTeam.id);
  console.log('\n--- HAX DB Players ---');
  console.log(JSON.stringify(players, null, 2));
}

const haxEntry = crewList.find(e => e.team.toLowerCase() === 'hax');
console.log('\n--- HAX Crewlist Entry ---');
console.log(JSON.stringify(haxEntry, null, 2));
