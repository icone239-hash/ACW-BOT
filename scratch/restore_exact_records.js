const fs = require('fs');
const path = require('path');
const db = require('../database');

const exactRecords = {
  "hax": { wins: 10, losses: 2, ties: 0 },
  "haunt": { wins: 2, losses: 1, ties: 0 },
  "quray": { wins: 1, losses: 1, ties: 0 },
  "jams academy": { wins: 1, losses: 0, ties: 0 },
  "saintly": { wins: 0, losses: 1, ties: 0 },
  "shine": { wins: 0, losses: 1, ties: 0 },
  "egypt": { wins: 1, losses: 0, ties: 0 },
  "pain": { wins: 0, losses: 3, ties: 0 },
  "affinity": { wins: 0, losses: 1, ties: 0 },
  "regain": { wins: 0, losses: 1, ties: 0 },
  "desire": { wins: 0, losses: 1, ties: 0 },
  "passion": { wins: 0, losses: 1, ties: 0 }
};

const teams = db.getTeams();

teams.forEach(t => {
  const key = t.name.toLowerCase().trim();
  const rec = exactRecords[key];
  if (rec) {
    db.updateTeamRecord(t.id, {
      wins: rec.wins,
      losses: rec.losses,
      ties: rec.ties,
      pointsFor: rec.wins * 4,
      pointsAgainst: rec.losses * 4
    });
    console.log(`[RESTORED] Team "${t.name}" -> ${rec.wins}W - ${rec.losses}L`);
  } else {
    db.updateTeamRecord(t.id, {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0
    });
  }
});

// Copy to data_init
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');
fs.copyFileSync(TEAMS_PATH, INIT_TEAMS_PATH);

console.log('[RESTORE] Successfully restored exact team win/loss records for all teams!');
