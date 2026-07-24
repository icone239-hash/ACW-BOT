// scratch/resolve_roles_across_servers.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const GUILD_1 = '1525985063143997691';
const GUILD_2 = '1477868796021833890';

const ids = [
  '1526013210283737128',
  '1526687640307630282',
  '1526273201628254362',
  '1526310732818550894',
  '1527445549320507514',
  '1526232088565780623',
  '1527391409450254356',
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

    console.log('Resolving IDs across Guild 1 and Guild 2...');
    ids.forEach(id => {
      let match = roles1.find(r => r.id === id);
      if (match) {
        console.log(`ID ${id} -> Name: "${match.name}" (in Guild 1)`);
      } else {
        match = roles2.find(r => r.id === id);
        if (match) {
          console.log(`ID ${id} -> Name: "${match.name}" (in Guild 2)`);
        } else {
          console.log(`ID ${id} -> NOT FOUND`);
        }
      }
    });

  } catch (err) {
    console.error(err);
  }
}

run();
