const fs = require('fs');
const path = require('path');

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(getAllJsFiles(filePath));
      }
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const jsFiles = getAllJsFiles(__dirname);
const externalModules = new Set();

jsFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const regex = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const req = match[1];
    if (!req.startsWith('.') && !req.startsWith('/')) {
      externalModules.add(req);
    }
  }
});

console.log('All external required modules:', Array.from(externalModules));
