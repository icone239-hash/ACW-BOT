// Debug script - log raw API response to see what's actually returned
const https = require('https');
const fs = require('fs');

const TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const GUILD_ID = '1477868796021833890';
const GENERAL_ID = '1477876979494686922';
const CMDS_ID = '1478215820654936244';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function req(path) {
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
        'Referer': `https://discord.com/channels/${GUILD_ID}/${GENERAL_ID}`,
        'X-Discord-Locale': 'en-US',
      }
    };
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    r.on('error', e => resolve({ error: e.message }));
    r.end();
  });
}

async function main() {
  // Try multiple endpoint variations on the general channel
  const endpoints = [
    `/channels/${GENERAL_ID}/application-commands/search?type=1&query=&limit=25&include_applications=true`,
    `/channels/${GENERAL_ID}/application-commands/search?query=&limit=25&include_applications=true`,
    `/channels/${GENERAL_ID}/application-commands/search?type=1&query=clear&limit=25&include_applications=true`,
    `/channels/${GENERAL_ID}/application-commands/search?limit=25&include_applications=true`,
    `/channels/${CMDS_ID}/application-commands/search?type=1&query=&limit=25&include_applications=true`,
    `/channels/${CMDS_ID}/application-commands/search?query=clear&limit=25&include_applications=true`,
  ];

  for (const ep of endpoints) {
    console.log(`\nTrying: ${ep}`);
    const res = await req(ep);
    console.log(`Status: ${res.status}`);
    if (res.data) {
      console.log('Keys in response:', Object.keys(res.data));
      const cmds = res.data.application_commands || res.data.commands || res.data.data || [];
      console.log('Command count:', Array.isArray(cmds) ? cmds.length : 'N/A');
      if (Array.isArray(cmds) && cmds.length > 0) {
        console.log('First command:', JSON.stringify(cmds[0]).substring(0, 200));
      } else {
        // Show raw if no commands
        console.log('Raw response:', JSON.stringify(res.data).substring(0, 300));
      }
    } else if (res.raw) {
      console.log('Raw:', res.raw.substring(0, 300));
    }
    await sleep(1500);
  }
}

main().catch(console.error);
