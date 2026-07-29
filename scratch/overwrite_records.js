const fs = require('fs');
const path = require('path');

const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');

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

if (fs.existsSync(TEAMS_PATH)) {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  teams.forEach(t => {
    const key = t.name.toLowerCase().trim();
    const rec = exactRecords[key];
    if (rec) {
      t.wins = rec.wins;
      t.losses = rec.losses;
      t.ties = rec.ties;
      t.pointsFor = rec.wins * 4;
      t.pointsAgainst = rec.losses * 4;
      console.log(`[RESET] Team "${t.name}" -> ${rec.wins}W - ${rec.losses}L`);
    } else {
      t.wins = 0;
      t.losses = 0;
      t.ties = 0;
      t.pointsFor = 0;
      t.pointsAgainst = 0;
    }
  });

  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
  fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
  console.log('[OVERWRITE] Successfully set exact records in teams.json and data_init/teams.json!');
} else {
  console.error('[OVERWRITE] teams.json not found!');
}
