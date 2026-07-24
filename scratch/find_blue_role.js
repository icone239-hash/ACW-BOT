// scratch/find_blue_role.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_GUILD_ID = '1525985063143997691';

async function run() {
  const res = await fetch(`https://discord.com/api/v9/guilds/${SOURCE_GUILD_ID}/roles`, {
    headers: {
      Authorization: USER_TOKEN
    }
  });
  const roles = await res.json();
  console.log('Source Guild Roles & Colors:');
  roles.forEach(r => {
    const hex = '#' + r.color.toString(16).padStart(6, '0');
    console.log(`- Name: ${r.name} | Hex: ${hex} | Color Dec: ${r.color}`);
  });
}

run();
