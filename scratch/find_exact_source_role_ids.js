// scratch/find_exact_source_role_ids.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const GUILD_1 = '1525985063143997691';
const GUILD_2 = '1477868796021833890';

const ids = [
  '1526232088565780623',
  '1526249520399384637'
];

async function apiFetch(guildId) {
  const res = await fetch(`https://discord.com/api/v9/guilds/${guildId}/roles`, {
    headers: { Authorization: USER_TOKEN }
  });
  return res.json();
}

async function run() {
  try {
    const roles1 = await apiFetch(GUILD_1);
    const roles2 = await apiFetch(GUILD_2);

    console.log('Searching for exact IDs...');
    
    ids.forEach(id => {
      const r1 = roles1.find(r => r.id === id);
      if (r1) {
        console.log(`ID ${id} -> Name: "${r1.name}" (in Guild 1)`);
      }
      const r2 = roles2.find(r => r.id === id);
      if (r2) {
        console.log(`ID ${id} -> Name: "${r2.name}" (in Guild 2)`);
      }
    });

  } catch (e) {
    console.error(e);
  }
}

run();
