// scratch/delete_xeno.js
const fs = require('fs');
const path = require('path');

const paths = [
  path.join(__dirname, '../data/crewlist.json'),
  path.join(__dirname, '../data/teams.json'),
  path.join(__dirname, '../data_init/crewlist.json'),
  path.join(__dirname, '../data_init/teams.json')
];

for (const filepath of paths) {
  if (fs.existsSync(filepath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      if (Array.isArray(data)) {
        const filtered = data.filter(entry => {
          const name = (entry.team || entry.name || '').toLowerCase();
          return name !== 'xeno';
        });
        fs.writeFileSync(filepath, JSON.stringify(filtered, null, 2), 'utf8');
        console.log(`Successfully removed Xeno from: ${path.basename(filepath)}`);
      }
    } catch (err) {
      console.error(`Error processing ${filepath}:`, err);
    }
  }
}
