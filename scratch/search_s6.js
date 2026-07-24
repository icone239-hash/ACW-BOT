// scratch/search_s6.js
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

console.log('Searching for "S6" in codebase...');
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('S6')) {
      console.log(`- File: ${path.relative(path.join(__dirname, '..'), file)}:${idx + 1} | Line: ${line.trim()}`);
    }
  });
});
