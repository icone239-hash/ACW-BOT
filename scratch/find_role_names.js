// scratch/find_role_names.js
const fs = require('fs');

const data = fs.readFileSync('scratch/roles_output.txt', 'utf16le');
const lines = data.split('\n');

const ids = [
  '1526013210283737128',
  '1526687640307630282',
  '1526273201628254362',
  '1526310732818550894',
  '1527445549320507514',
  '1526232088565780623',
  '1527391409450254356',
  '1526249520399384637'
];

console.log('Searching for roles by ID:');
lines.forEach(line => {
  ids.forEach(id => {
    if (line.includes(id)) {
      console.log(`Match for ${id}: ${line.trim()}`);
    }
  });
});
