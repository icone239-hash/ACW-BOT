// scratch/find_owner_roles.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');

const SOURCE_GUILD_ID = '1477868796021833890';
const TARGET_GUILD_ID = '1528909271633363185';

async function run() {
  try {
    const srcRes = await fetch(`https://discord.com/api/v9/guilds/${SOURCE_GUILD_ID}/roles`, {
      headers: { Authorization: USER_TOKEN }
    });
    const srcRoles = await srcRes.json();

    const tgtRes = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
      headers: { Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}` }
    });
    const tgtRoles = await tgtRes.json();

    const tgtRoleNames = new Set(tgtRoles.map(r => r.name.toLowerCase()));

    console.log('--- Searching Source ACW Server for Owner / Co-Owner Roles ---');
    const ownerRoles = srcRoles.filter(r => 
      r.name.toLowerCase().includes('owner') || 
      r.name.toLowerCase().includes('co') ||
      r.name.toLowerCase().includes('fo') ||
      r.name.toLowerCase().includes('gm') ||
      r.name.toLowerCase().includes('coach')
    );

    ownerRoles.forEach(r => {
      const exists = tgtRoleNames.has(r.name.toLowerCase());
      console.log(`- Role: "${r.name}" | Exists in Target: ${exists}`);
    });

    // Explicit list of Owner / Co-Owner / Franchise roles to guarantee exist
    const essentialOwnerRoles = [
      { name: 'Franchise Owner', color: 0xFFD700, hoist: true },
      { name: 'Co-Owner', color: 0xF1C40F, hoist: true },
      { name: 'Co-FO', color: 0xF39C12, hoist: true },
      { name: 'General Manager', color: 0x3498DB, hoist: true },
      { name: 'Head Coach', color: 0x2ECC71, hoist: true },
      { name: 'Assistant Coach', color: 0x1ABC9C, hoist: true }
    ];

    for (const roleDef of essentialOwnerRoles) {
      if (!tgtRoleNames.has(roleDef.name.toLowerCase())) {
        console.log(`Creating missing essential role: "${roleDef.name}"...`);
        const res = await fetch(`https://discord.com/api/v9/guilds/${TARGET_GUILD_ID}/roles`, {
          method: 'POST',
          headers: {
            Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: roleDef.name,
            color: roleDef.color,
            hoist: roleDef.hoist,
            mentionable: true
          })
        });
        if (res.ok) {
          console.log(`✅ Created "${roleDef.name}"`);
        } else {
          const err = await res.json();
          console.error(`❌ Failed to create "${roleDef.name}":`, err);
        }
      } else {
        console.log(`⏩ "${roleDef.name}" already exists in target server.`);
      }
    }

  } catch (err) {
    console.error(err);
  }
}

run();
