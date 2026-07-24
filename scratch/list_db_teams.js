// scratch/list_db_teams.js
const db = require('../database');
console.log('Current DB Teams:');
console.log(JSON.stringify(db.getTeams(), null, 2));
