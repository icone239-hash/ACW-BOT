// scratch/resolve_crew_owners.js
const config = require('../config.json');
const crewList = require('../data/crewlist.json');

async function run() {
  console.log('--- Resolving Crew Owners Handles ---');
  const updatedCrewList = [];

  for (const entry of crewList) {
    let handle = entry.ownerTag;

    if (entry.ownerId) {
      try {
        const res = await fetch(`https://discord.com/api/v10/users/${entry.ownerId}`, {
          headers: { Authorization: `Bot ${config.token}` }
        });
        if (res.ok) {
          const u = await res.json();
          const cleanName = u.global_name || u.username;
          console.log(`Team "${entry.team}" | OwnerID: ${entry.ownerId} -> @${cleanName} (@${u.username})`);
          handle = `@${cleanName}`;
        } else {
          console.log(`Team "${entry.team}" | OwnerID: ${entry.ownerId} -> API Status ${res.status}`);
        }
      } catch (err) {
        console.error(`Team "${entry.team}" Error: ${err.message}`);
      }
    }

    updatedCrewList.push({
      ...entry,
      ownerHandle: handle
    });
  }

  console.log('\n--- Resolution Complete ---');
}

run();
