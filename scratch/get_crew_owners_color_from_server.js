// scratch/get_crew_owners_color_from_server.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_GUILD_ID = '1477868796021833890';
const TARGET_GUILD_ID = '1528909271633363185';
const INVITE_CODE = 'UENvjCV2r';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function run() {
  try {
    console.log(`Attempting to join server ${SOURCE_GUILD_ID} using invite ${INVITE_CODE}...`);
    // POST request to join the guild using the user token
    const joinRes = await fetch(`https://discord.com/api/v9/invites/${INVITE_CODE}`, {
      method: 'POST',
      headers: {
        Authorization: USER_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (joinRes.ok) {
      console.log('✅ Successfully joined source server via user token!');
    } else {
      console.log(`ℹ️ Note: Join returned status ${joinRes.status} (user may already be in the server).`);
    }

    console.log('Fetching roles from source server...');
    const rolesRes = await fetch(`https://discord.com/api/v9/guilds/${SOURCE_GUILD_ID}/roles`, {
      headers: {
        Authorization: USER_TOKEN
      }
    });

    if (!rolesRes.ok) {
      const errText = await rolesRes.text();
      throw new Error(`Failed to fetch source roles: ${rolesRes.status} - ${errText}`);
    }

    const roles = await rolesRes.json();
    console.log(`Fetched ${roles.length} roles from source server.`);

    // Find role containing "crew owner"
    const crewOwnerRole = roles.find(r => {
      const name = r.name.toLowerCase();
      return name === 'crew owner' || name === 'crew owners';
    });

    if (!crewOwnerRole) {
      console.error('❌ Could not find "Crew Owner" or "Crew Owners" role in source server.');
      console.log('Available roles in source:');
      roles.forEach(r => console.log(`- ${r.name} (${r.color})`));
      process.exit(1);
    }

    const hexColor = '#' + crewOwnerRole.color.toString(16).padStart(6, '0');
    console.log(`✅ Found role "${crewOwnerRole.name}" with color: ${hexColor} (${crewOwnerRole.color})`);

    // Log in as bot client to update target role color
    client.once('ready', async () => {
      try {
        const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (!targetGuild) {
          console.error('❌ Target guild not found.');
          process.exit(1);
        }

        const targetRole = targetGuild.roles.cache.find(r => r.name.toLowerCase() === 'crew owners');
        if (!targetRole) {
          console.error('❌ "Crew Owners" role not found in target server.');
          process.exit(1);
        }

        await targetRole.setColor(crewOwnerRole.color);
        console.log(`✅ Successfully updated target "Crew Owners" color to ${hexColor}!`);
        process.exit(0);
      } catch (err) {
        console.error('Bot client failed:', err);
        process.exit(1);
      }
    });

    client.login(config.token);

  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

run();
