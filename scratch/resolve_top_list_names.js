// scratch/resolve_top_list_names.js
const config = require('../config.json');

const ids = [
  '749376790795124737',
  '1266298590351986792',
  '1486852030596386947',
  '725135133568663633',
  '1456171646745444506',
  '1481784863521771705',
  '1059699158212169758',
  '1476415131666743376',
  '819375803556560907',
  '1273443757718769676',
  '1483275547290243185',
  '1479638735321567408',
  '531550641336877057',
  '1473692183860215810',
  '1279863242767990807',
  '1378986194205151242',
  '1515886618232225892'
];

async function run() {
  console.log('--- Resolving User IDs via Bot Token ---');
  for (const id of ids) {
    try {
      const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
        headers: { Authorization: `Bot ${config.token}` }
      });
      if (res.ok) {
        const u = await res.json();
        console.log(`ID: "${id}" -> Username: "@${u.username}"`);
      } else {
        console.log(`ID: "${id}" -> Status ${res.status}`);
      }
    } catch (err) {
      console.log(`ID: "${id}" -> ERROR: ${err.message}`);
    }
  }
}

run();
