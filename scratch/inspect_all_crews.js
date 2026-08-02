const fs = require('fs');
const path = require('path');

const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));

console.log(`Total Crews in crewlist.json (${crewList.length}):`);
crewList.forEach((c, idx) => {
  console.log(`${idx + 1}. "${c.team}" (Role ID: ${c.roleId || 'N/A'}, Owner: ${c.ownerTag || c.ownerId})`);
});
