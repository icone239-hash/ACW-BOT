const db = require('../database');
const fs = require('fs');
const path = require('path');

const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
const DIVISIONS = [
  'North Division (American Conference)',
  'South Division (American Conference)',
  'Central Division (American Conference)',
  'Gulf Division (American Conference)'
];

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
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

  // Fill underflow up to minPerDiv
  DIVISIONS.forEach(d => {
    while (divBuckets[d].length < minPerDiv && unassigned.length > 0) {
      const t = unassigned.shift();
      divBuckets[d].push(t);
    }
  });

  // Distribute remaining
  let idx = 0;
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

  console.log(`[BALANCE] Successfully balanced ${total} teams across 4 divisions:`);
  DIVISIONS.forEach(d => {
    console.log(`  - ${d}: ${divBuckets[d].length} teams`);
  });
}

balanceAllDivisionsEvenly();
