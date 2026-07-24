// scratch/find_extra.js
const fs = require('fs');

const data = fs.readFileSync('scratch/roles_output.txt', 'utf16le');
const lines = data.split('\n');

const targetRoles = [];
const sourceRoles = [];

let section = '';
for (const line of lines) {
  if (line.includes('Target server has')) {
    section = 'target';
    continue;
  }
  if (line.includes('Source server has')) {
    section = 'source';
    continue;
  }
  
  if (line.startsWith('- ')) {
    const roleName = line.slice(2, line.lastIndexOf(' (')).trim();
    if (section === 'target') {
      targetRoles.push(roleName.toLowerCase());
    } else if (section === 'source') {
      sourceRoles.push(roleName.toLowerCase());
    }
  }
}

const sourceSet = new Set(sourceRoles);
const extra = [];
for (const t of targetRoles) {
  if (!sourceSet.has(t) && t !== '@everyone' && t !== 'acfw park wars bot') {
    extra.push(t);
  }
}

console.log(`Found ${extra.length} target roles NOT in source server:`);
console.log(extra.slice(0, 30));
