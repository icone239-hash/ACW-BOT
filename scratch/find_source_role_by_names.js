// scratch/find_source_role_by_names.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const GUILD_1 = '1525985063143997691';

async function run() {
  const res = await fetch(`https://discord.com/api/v9/guilds/${GUILD_1}/roles`, {
    headers: { Authorization: USER_TOKEN }
  });
  const roles = await res.json();
  const searchNames = ['reaper', 'volkno', 'aspen', 'hax', 'china', 'quray', 'jams academy', 'regain', 'pain'];
  console.log('Searching source roles:');
  roles.forEach(r => {
    if (searchNames.some(name => r.name.toLowerCase().includes(name))) {
      console.log(`- Name: ${r.name} | ID: ${r.id}`);
    }
  });
}

run();
