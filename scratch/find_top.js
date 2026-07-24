// scratch/find_top.js
const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.json')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk(path.join(__dirname, '..'));

console.log('Searching for "top" in codebase...');
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.toLowerCase().includes('toplist') || content.toLowerCase().includes('top-list')) {
    console.log(`- Match: ${path.relative(path.join(__dirname, '..'), file)}`);
  }
});
