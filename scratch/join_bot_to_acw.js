// scratch/join_bot_to_acw.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const CLIENT_ID = '1528908590822199497';
const GUILD_ID = '1525985063143997691';

async function run() {
  try {
    console.log(`Attempting to authorize bot (${CLIENT_ID}) in guild (${GUILD_ID})...`);
    
    // Authorize endpoint
    const res = await fetch(`https://discord.com/api/v9/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot%20applications.commands`, {
      method: 'POST',
      headers: {
        Authorization: USER_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guild_id: GUILD_ID,
        permissions: '8',
        authorize: true
      })
    });

    const data = await res.json();
    console.log('Authorization response:', data);

    if (res.ok && data.location) {
      console.log('🎉 Bot successfully authorized and added to ACW server!');
    } else {
      console.log('Invite URL to manually click if needed:');
      console.log(`https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
