// scratch/get_bot_guilds.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const config = require('../config.json');

async function run() {
  try {
    console.log('--- Fetching Bot Guilds ---');
    const botRes = await fetch('https://discord.com/api/v9/users/@me/guilds', {
      headers: { Authorization: config.token.startsWith('Bot ') ? config.token : `Bot ${config.token}` }
    });
    const botGuilds = await botRes.json();

    console.log('\n--- Bot Guilds ---');
    if (Array.isArray(botGuilds)) {
      botGuilds.forEach(g => {
        console.log(`- Name: "${g.name}" | ID: ${g.id} | Owner: ${g.owner}`);
      });
    } else {
      console.log('Bot guilds error:', botGuilds);
    }

    console.log('\n--- Fetching User Guilds ---');
    const userRes = await fetch('https://discord.com/api/v9/users/@me/guilds', {
      headers: { Authorization: USER_TOKEN }
    });
    const userGuilds = await userRes.json();

    console.log('\n--- User Guilds ---');
    if (Array.isArray(userGuilds)) {
      userGuilds.forEach(g => {
        console.log(`- Name: "${g.name}" | ID: ${g.id} | Owner: ${g.owner}`);
      });
    } else {
      console.log('User guilds error:', userGuilds);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
