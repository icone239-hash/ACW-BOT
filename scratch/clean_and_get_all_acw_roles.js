// scratch/clean_and_get_all_acw_roles.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');

const SOURCE_GUILD_ID = '1477868796021833890'; // ACW Source
const TARGET_GUILD_ID = '1528909271633363185'; // Target Testing Server

async function run() {
  try {
    console.log(`Fetching roles from ACW source (${SOURCE_GUILD_ID})...`);
    const srcRes = await fetch(`https://discord.com/api/v9/guilds/${SOURCE_GUILD_ID}/roles`, {
      headers: { Authorization: USER_TOKEN }
    });
    const srcRoles = await srcRes.json();

    console.log(`Fetching roles from Target Server (${TARGET_GUILD_ID})...`);
    const tgtRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
      headers: { Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}` }
    });
    const tgtRoles = await tgtRes.json();

    const srcRoleNames = new Set(srcRoles.map(r => r.name.toLowerCase()));
    const tgtRoleNames = new Set(tgtRoles.map(r => r.name.toLowerCase()));

    console.log(`Source ACW has ${srcRoles.length} roles.`);
    console.log(`Target server has ${tgtRoles.length} roles.`);

    // Find missing ACW roles in target server
    const missingRoles = srcRoles.filter(r => r.name !== '@everyone' && !r.managed && !tgtRoleNames.has(r.name.toLowerCase()));
    console.log(`Missing ACW roles (${missingRoles.length}):`, missingRoles.map(r => r.name));

    // If target server is full (near 250 roles), clean up duplicate roles in target server
    if (tgtRoles.length + missingRoles.length > 248) {
      console.log('Target server is near role limit. Cleaning up duplicate/unneeded roles...');
      
      const seenNames = new Set();
      const duplicateRoles = [];

      for (const r of tgtRoles) {
        if (r.name === '@everyone' || r.managed) continue;
        const lower = r.name.toLowerCase();
        if (seenNames.has(lower)) {
          duplicateRoles.push(r);
        } else {
          seenNames.add(lower);
        }
      }

      console.log(`Found ${duplicateRoles.length} duplicate roles in target server.`);
      for (const r of duplicateRoles) {
        console.log(`Deleting duplicate role "${r.name}" (${r.id})...`);
        await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles/${r.id}`, {
          method: 'DELETE',
          headers: { Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}` }
        });
        await new Promise(res => setTimeout(res, 400));
      }
    }

    // Now re-fetch target roles
    const updatedTgtRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
      headers: { Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}` }
    });
    const updatedTgtRoles = await updatedTgtRes.json();
    const updatedTgtNames = new Set(updatedTgtRoles.map(r => r.name.toLowerCase()));

    const stillMissing = srcRoles.filter(r => r.name !== '@everyone' && !r.managed && !updatedTgtNames.has(r.name.toLowerCase()));
    console.log(`Creating ${stillMissing.length} remaining missing roles...`);

    for (const role of stillMissing) {
      console.log(`Creating role "${role.name}"...`);
      const createRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
        method: 'POST',
        headers: {
          Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          mentionable: role.mentionable,
          permissions: role.permissions
        })
      });

      if (createRes.ok) {
        console.log(`✅ Created "${role.name}"`);
      } else {
        const err = await createRes.json();
        console.error(`❌ Failed to create "${role.name}":`, err);
      }
      await new Promise(res => setTimeout(res, 500));
    }

    console.log('🎉 ALL ACW ROLES ARE NOW IN THE TESTING SERVER!');
  } catch (err) {
    console.error(err);
  }
}

run();
