// scratch/ensure_acw_suspended_role.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');

const ACW_GUILD_ID = '1525985063143997691';
const SUSPENSION_CHANNEL_ID = '1526012668752953414';

async function run() {
  try {
    console.log(`=== Ensuring Suspended Role in Official ACW Server (${ACW_GUILD_ID}) ===`);

    const rolesRes = await fetch(`https://discord.com/api/v9/guilds/${ACW_GUILD_ID}/roles`, {
      headers: { Authorization: USER_TOKEN }
    });
    const roles = await rolesRes.json();

    let suspendedRole = roles.find(r => 
      r.name.toLowerCase() === 'suspended' || 
      r.name.toLowerCase() === 'suspension' ||
      r.name.toLowerCase() === 'suspend'
    );

    if (!suspendedRole) {
      console.log('Creating "Suspended" role in ACW server...');
      const createRes = await fetch(`https://discord.com/api/v9/guilds/${ACW_GUILD_ID}/roles`, {
        method: 'POST',
        headers: {
          Authorization: USER_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Suspended',
          color: 0x99AAB5,
          hoist: true,
          mentionable: true
        })
      });
      suspendedRole = await createRes.json();
      console.log(`✅ Created "Suspended" role (ID: ${suspendedRole.id})`);
    } else {
      console.log(`⏩ "Suspended" role already exists (ID: ${suspendedRole.id})`);
    }

    // Verify channel
    const chRes = await fetch(`https://discord.com/api/v9/channels/${SUSPENSION_CHANNEL_ID}`, {
      headers: { Authorization: USER_TOKEN }
    });
    const channel = await chRes.json();
    console.log(`Verified suspensions channel: #${channel.name} (${channel.id})`);

  } catch (err) {
    console.error(err);
  }
}

run();
