const fs = require('fs');
const path = require('path');

const list = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));
console.log(`Total entries in crewlist.json: ${list.length}`);
list.forEach((c, i) => {
  console.log(`${i+1}. Team: "${c.team}", RoleID: "${c.roleId || 'NONE'}", Owner: "${c.ownerTag || c.ownerHandle || 'NONE'}"`);
});
