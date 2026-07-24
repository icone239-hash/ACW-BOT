// scratch/sync_acw_roles.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');

const SOURCE_GUILD_ID = '1477868796021833890'; // PW / ACW source
const TARGET_GUILD_ID = '1528909271633363185'; // Bot testing server

async function run() {
  try {
    console.log(`Fetching roles from source server (${SOURCE_GUILD_ID})...`);
    const srcRes = await fetch(`https://discord.com/api/v9/guilds/${SOURCE_GUILD_ID}/roles`, {
      headers: { Authorization: USER_TOKEN }
    });
    const srcRoles = await srcRes.json();

    if (!Array.isArray(srcRoles)) {
      console.error('Failed to fetch source roles:', srcRoles);
      process.exit(1);
    }

    console.log(`Found ${srcRoles.length} roles in source server.`);

    console.log(`Fetching roles from target server (${TARGET_GUILD_ID})...`);
    const tgtRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
      headers: { Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}` }
    });
    const tgtRoles = await tgtRes.json();

    if (!Array.isArray(tgtRoles)) {
      console.error('Failed to fetch target roles:', tgtRoles);
      process.exit(1);
    }

    console.log(`Found ${tgtRoles.length} roles in target server.`);

    const existingNames = new Set(tgtRoles.map(r => r.name.toLowerCase()));

    let createdCount = 0;
    // Iterate source roles in reverse order (bottom to top position)
    for (const role of srcRoles.reverse()) {
      if (role.name === '@everyone' || role.managed) continue;

      if (!existingNames.has(role.name.toLowerCase())) {
        console.log(`Creating missing role: "${role.name}" (Color: #${role.color.toString(16)})...`);
        
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
          createdCount++;
          console.log(`✅ Successfully created role "${role.name}"`);
        } else {
          const err = await createRes.json();
          console.error(`❌ Failed to create role "${role.name}":`, err);
        }

        // Slight delay to avoid rate limit
        await new Promise(r => setTimeout(r, 500));
      } else {
        console.log(`⏩ Role "${role.name}" already exists.`);
      }
    }

    console.log(`\n🎉 Finished syncing ACW roles! Created ${createdCount} missing roles.`);
  } catch (err) {
    console.error('Error syncing roles:', err);
  }
}

run();
