const fs = require('fs');
const path = require('path');

const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams.json'), 'utf8'));

console.log('Total Crews in crewlist.json:', crewList.length);
console.log('Total Teams in teams.json:', teams.length);

const crewTeamNames = crewList.map(c => c.team.toLowerCase().trim());

const ghostTeams = teams.filter(t => !crewTeamNames.includes(t.name.toLowerCase().trim()));
console.log('\nGhost Teams in teams.json (not in crewlist.json):', ghostTeams.map(t => t.name));

const targets = ['nova', 'apex', 'jams academy'];
targets.forEach(tgt => {
  const inCrew = crewList.find(c => c.team.toLowerCase().trim() === tgt);
  const inDb = teams.find(t => t.name.toLowerCase().trim() === tgt);
  console.log(`\nTarget "${tgt}":`);
  console.log(' In crewlist.json:', inCrew ? inCrew : 'NO');
  console.log(' In teams.json:', inDb ? inDb : 'NO');
});
