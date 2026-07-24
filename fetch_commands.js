// Fetch ALL Park Wars Manager commands - targeting #general and #cmds directly
const https = require('https');
const fs = require('fs');

const TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const GUILD_ID = '1477868796021833890';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v9${path}`,
      method: 'GET',
      headers: {
        'Authorization': TOKEN,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://discord.com',
        'Referer': `https://discord.com/channels/${GUILD_ID}`,
        'X-Discord-Locale': 'en-US',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data: {}, headers: res.headers }); }
      });
    });
    req.on('error', () => resolve({ status: 0, data: {}, headers: {} }));
    req.end();
  });
}

async function fetchWithRetry(path, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await apiRequest(path);
    if (res.status === 429) {
      const wait = ((res.data.retry_after || 2) * 1000) + 1000;
      console.log(`  ⏳ Rate limited, waiting ${(wait/1000).toFixed(1)}s...`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  return { status: 429, data: {} };
}

async function main() {
  console.log('🏈 Fetching Park Wars Manager commands...\n');

  // Step 1: Get all channels and find #general and #cmds
  console.log('📡 Getting channels...');
  const chRes = await fetchWithRetry(`/guilds/${GUILD_ID}/channels`);
  if (chRes.status !== 200) {
    console.error('Failed to get channels:', chRes.status, chRes.data);
    return;
  }

  const channels = chRes.data.filter(c => c.type === 0);
  const targets = channels.filter(c =>
    c.name.includes('general') ||
    c.name.includes('cmds') ||
    c.name.includes('cmd') ||
    c.name.includes('bot')
  );

  console.log(`Found target channels:`);
  targets.forEach(c => console.log(`  - #${c.name} (${c.id})`));

  // Step 2: Try each target channel
  let allCommands = [];
  let workingChannel = null;

  for (const ch of targets) {
    console.log(`\n🔍 Trying #${ch.name} (${ch.id})...`);
    await sleep(2000); // wait before trying

    const res = await fetchWithRetry(
      `/channels/${ch.id}/application-commands/search?type=1&query=&limit=25&include_applications=true`
    );

    console.log(`  Status: ${res.status}, Commands: ${(res.data.application_commands || []).length}`);

    if (res.status === 200 && (res.data.application_commands || []).length > 0) {
      console.log(`✅ Got ${res.data.application_commands.length} commands from #${ch.name}!`);
      workingChannel = ch;
      allCommands = [...res.data.application_commands];

      // Fetch remaining pages
      let cursor = res.data.cursor_next;
      while (cursor) {
        console.log(`  📄 Fetching next page...`);
        await sleep(1500);
        const pageRes = await fetchWithRetry(
          `/channels/${ch.id}/application-commands/search?type=1&query=&limit=25&include_applications=true&cursor=${encodeURIComponent(cursor)}`
        );
        if (pageRes.status !== 200) break;
        const cmds = pageRes.data.application_commands || [];
        allCommands.push(...cmds);
        console.log(`  Got ${cmds.length} more (total: ${allCommands.length})`);
        cursor = pageRes.data.cursor_next;
        if (cmds.length < 25) break;
      }
      break;
    }
  }

  if (allCommands.length === 0) {
    console.log('\n❌ Could not pull commands from those channels.');
    console.log('Try providing the exact channel ID from Discord.');
    return;
  }

  // Step 3: Format and save
  allCommands.sort((a, b) => a.name.localeCompare(b.name));

  const output = [];
  console.log('\n============================================================');
  console.log(`✅ Total Commands Found: ${allCommands.length}`);
  console.log('============================================================\n');

  for (const cmd of allCommands) {
    const desc = cmd.description || '(no description)';
    const opts = (cmd.options || []).filter(o => o.type === 1 || o.type === 2);

    if (opts.length > 0) {
      for (const sg of opts) {
        if (sg.type === 2) {
          for (const sc of (sg.options || []).filter(o => o.type === 1)) {
            const line = `/${cmd.name} ${sg.name} ${sc.name} — ${sc.description || sg.description}`;
            output.push(line); console.log(line);
          }
        } else {
          const line = `/${cmd.name} ${sg.name} — ${sg.description}`;
          output.push(line); console.log(line);
        }
      }
    } else {
      const line = `/${cmd.name} — ${desc}`;
      output.push(line); console.log(line);
    }
  }

  fs.writeFileSync('pw_commands.txt', output.join('\n'), 'utf8');
  fs.writeFileSync('pw_commands_raw.json', JSON.stringify(allCommands, null, 2), 'utf8');
  console.log(`\n📄 ${output.length} commands saved to pw_commands.txt`);
  console.log('📦 Raw JSON saved to pw_commands_raw.json');
}

main().catch(console.error);
