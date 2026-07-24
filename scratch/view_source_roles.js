// scratch/view_source_roles.js
const fs = require('fs');

const data = fs.readFileSync('scratch/roles_output.txt', 'utf16le');
const lines = data.split('\n');

let print = false;
let count = 0;
for (const line of lines) {
  if (line.includes('Source server has')) {
    print = true;
  }
  if (print) {
    console.log(line);
    count++;
    if (count > 50) break;
  }
}
