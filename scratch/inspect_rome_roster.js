const fs = require('fs');
const path = require('path');

const players = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/players.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams.json'), 'utf8'));
const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));

const romeTeam = teams.find(t => t.name.toLowerCase() === 'rome');
console.log('Rome DB Team:', romeTeam);

const romeCrew = crewList.find(c => c.team.toLowerCase() === 'rome');
console.log('Rome Crew Entry:', romeCrew);

if (romeTeam) {
  const romePlayers = players.filter(p => p.teamId === romeTeam.id);
  console.log(`Signed DB players for Rome (${romePlayers.length}):`);
  romePlayers.forEach(p => console.log(`- ${p.username} (ID: ${p.discordId || p.id})`));
}
