// scratch/add_literal_owner_role.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');

const TARGET_GUILD_ID = '1528909271633363185';

async function run() {
  try {
    const rolesRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
      headers: { Authorization: USER_TOKEN }
    });
    const roles = await rolesRes.json();

    let ownerRole = roles.find(r => r.name.toLowerCase() === 'owner');

    if (!ownerRole) {
      console.log('Creating "Owner" role...');
      const createRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
        method: 'POST',
        headers: {
          Authorization: USER_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Owner',
          color: 0xFFD700, // Gold
          hoist: true,
          mentionable: true,
          permissions: '8' // Administrator
        })
      });
      ownerRole = await createRes.json();
      console.log(`✅ Successfully created "Owner" role (ID: ${ownerRole.id})`);
    } else {
      console.log(`⏩ "Owner" role already exists (ID: ${ownerRole.id})`);
    }

    // Assign Owner role to user
    const userRes = await fetch('https://discord.com/api/v9/users/@me', {
      headers: { Authorization: USER_TOKEN }
    });
    const user = await userRes.json();

    console.log(`Assigning "Owner" role to user ${user.username} (${user.id})...`);
    const addRoleRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/members/${user.id}/roles/${ownerRole.id}`, {
      method: 'PUT',
      headers: { Authorization: USER_TOKEN }
    });

    if (addRoleRes.ok || addRoleRes.status === 240 || addRoleRes.status === 204) {
      console.log(`🎉 Successfully assigned "Owner" role to ${user.username}!`);
    } else {
      const err = await addRoleRes.json();
      console.error('Failed to assign role:', err);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
