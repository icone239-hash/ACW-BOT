const fs = require('fs');
const path = require('path');

const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');

// Exact historical records from a99f236 (before sync corruption)
const historicalRecords = [
  { "name": "HAX", "wins": 10, "losses": 2, "ties": 0, "pointsFor": 40, "pointsAgainst": 8 },
  { "name": "Haunt", "wins": 2, "losses": 1, "ties": 0, "pointsFor": 8, "pointsAgainst": 4 },
  { "name": "quray", "wins": 1, "losses": 1, "ties": 0, "pointsFor": 4, "pointsAgainst": 4 },
  { "name": "Jams Academy", "wins": 1, "losses": 0, "ties": 0, "pointsFor": 4, "pointsAgainst": 0 },
  { "name": "Desire", "wins": 0, "losses": 1, "ties": 0, "pointsFor": 0, "pointsAgainst": 4 },
  { "name": "Regain", "wins": 0, "losses": 1, "ties": 0, "pointsFor": 0, "pointsAgainst": 4 },
  { "name": "Affinity", "wins": 0, "losses": 1, "ties": 0, "pointsFor": 0, "pointsAgainst": 4 },
  { "name": "Pain", "wins": 0, "losses": 3, "ties": 0, "pointsFor": 0, "pointsAgainst": 12 },
  { "name": "Shine", "wins": 0, "losses": 1, "ties": 0, "pointsFor": 0, "pointsAgainst": 4 },
  { "name": "Egypt", "wins": 1, "losses": 0, "ties": 0, "pointsFor": 4, "pointsAgainst": 0 },
  { "name": "Saintly", "wins": 0, "losses": 1, "ties": 0, "pointsFor": 0, "pointsAgainst": 4 },
  { "name": "Passion", "wins": 0, "losses": 1, "ties": 0, "pointsFor": 1, "pointsAgainst": 4 }
];

if (fs.existsSync(TEAMS_PATH)) {
  const teams = JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8'));
  
  teams.forEach(t => {
    // Reset to 0 first
    t.wins = 0;
    t.losses = 0;
    t.ties = 0;
    t.pointsFor = 0;
    t.pointsAgainst = 0;

    // Apply historical records
    const hist = historicalRecords.find(h => h.name.toLowerCase() === t.name.toLowerCase());
    if (hist) {
      t.wins = hist.wins;
      t.losses = hist.losses;
      t.ties = hist.ties;
      t.pointsFor = hist.pointsFor;
      t.pointsAgainst = hist.pointsAgainst;
      console.log(`[RESTORED] Team "${t.name}" -> ${t.wins}W - ${t.losses}L`);
    }
  });

  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
  fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(teams, null, 2), 'utf8');
  console.log('[SUCCESS] Restored all teams to correct historical records!');
} else {
  console.error('teams.json not found');
}
