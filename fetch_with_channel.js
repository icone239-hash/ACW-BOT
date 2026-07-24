// Fetch ALL commands using channel ID 1528908590822199497
const https = require('https');
const fs = require('fs');

const TOKEN = 'MTUyODkwODU5MDgyMjE5OT45Nw.G1jHb4.YlFpInyTnIuqoKMs7eJr1S5SsSo5HFeYHSxV7g'; // raw token fix below
const CHANNEL_ID = '1528908590822199497';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v9${path}`,
      method: 'GET',
      headers: {
        'Authorization': 'MTUyODkwODU5MDgyMjE5OTQ5Nw.G1jHb4.YlFpInyTnIuqoKMs7eJr1S5SsSo5HFeYHSxV7g',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://discord.com',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', () => resolve({ status: 0, data: {} }));
    req.end();
  });
}

async function main() {
  console.log(`🏈 Fetching commands from channel ${CHANNEL_ID}...\n`);

  let allCommands = [];
  let cursor = null;

  while (true) {
    const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const url = `/channels/${CHANNEL_ID}/application-commands/search?type=1&query=&limit=25&include_applications=true${cursorParam}`;
    const res = await apiRequest(url);

    if (res.status === 429) {
      const wait = ((res.data.retry_after || 2) * 1000) + 1000;
      console.log(`  ⏳ Rate limited. Waiting ${(wait/1000).toFixed(1)}s...`);
      await sleep(wait);
      continue;
    }

    if (res.status !== 200) {
      console.log(`Error: Status ${res.status}`, JSON.stringify(res.data));
      break;
    }

    const cmds = res.data.application_commands || [];
    allCommands.push(...cmds);
    console.log(`Fetched ${cmds.length} commands (Total: ${allCommands.length})`);

    if (!res.data.cursor_next || cmds.length < 25) break;
    cursor = res.data.cursor_next;
    await sleep(600);
  }

  console.log('\n============================================================');
  console.log(`✅ Total Commands Found: ${allCommands.length}`);
  console.log('============================================================\n');

  allCommands.sort((a, b) => a.name.localeCompare(b.name));

  const output = [];
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
  console.log('\n📄 Saved to pw_commands.txt');
}

main().catch(console.error);
