// scratch/find_roles_in_all_user_guilds.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';

const ids = [
  '1526232088565780623',
  '1526249520399384637'
];

async function run() {
  try {
    console.log('Fetching all guilds the user is in...');
    const guildsRes = await fetch('https://discord.com/api/v9/users/@me/guilds', {
      headers: { Authorization: USER_TOKEN }
    });

    if (!guildsRes.ok) {
      throw new Error(`Failed to fetch guilds: ${guildsRes.status}`);
    }

    const guilds = await guildsRes.json();
    console.log(`User is in ${guilds.length} guilds. Scanning for role IDs...`);

    for (const g of guilds) {
      const rolesRes = await fetch(`https://discord.com/api/v9/guilds/${g.id}/roles`, {
        headers: { Authorization: USER_TOKEN }
      });

      if (rolesRes.ok) {
        const roles = await rolesRes.json();
        ids.forEach(id => {
          const match = roles.find(r => r.id === id);
          if (match) {
            console.log(`🎉 Found ID ${id} -> Name: "${match.name}" inside guild "${g.name}" (${g.id})`);
          }
        });
      }
    }
    console.log('Scan complete.');
  } catch (err) {
    console.error(err);
  }
}

run();
