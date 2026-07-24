// scratch/find_missing_source_roles.js
const fs = require('fs');

const data = fs.readFileSync('scratch/source_roles_colors.txt', 'utf8');
const lines = data.split('\n');

const ids = [
  '1526232088565780623',
  '1526249520399384637'
];

lines.forEach(line => {
  ids.forEach(id => {
    if (line.includes(id)) {
      console.log(`Found source match for ${id}: ${line}`);
    }
  });
});
