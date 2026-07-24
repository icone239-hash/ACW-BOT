// scratch/list_pw_channels.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';

async function run() {
  const res = await fetch('https://discord.com/api/v9/guilds/1477868796021833890/channels', {
    headers: { Authorization: USER_TOKEN }
  });
  const channels = await res.json();
  channels.forEach(c => {
    if (c.name.includes('top') || c.name.includes('list') || c.name.includes('rank') || c.name.includes('best') || c.name.includes('mvp')) {
      console.log(`- Channel: ${c.name} (${c.id})`);
    }
  });
}

run();
