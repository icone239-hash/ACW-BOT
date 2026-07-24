// Script to clone all categories, text channels, voice channels, and roles from PW server to Zenji server
const https = require('https');
const fs = require('fs');

// Your user token from config
const TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';

const SOURCE_GUILD_ID = '1477868796021833890'; // PW S6
const TARGET_GUILD_ID = '1528909271633363185'; // Zenji Server

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v9${path}`,
      method: method,
      headers: {
        'Authorization': TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchWithRetry(path, method = 'GET', body = null) {
  for (let i = 0; i < 5; i++) {
    const res = await apiRequest(path, method, body);
    if (res.status === 429) {
      const wait = ((res.data.retry_after || 2) * 1000) + 1000;
      console.log(`  ⏳ Rate limited. Waiting ${(wait/1000).toFixed(1)}s...`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  return { status: 429, data: {} };
}

async function cloneServer() {
  console.log(`🚀 Starting Server Cloner...`);
  console.log(`Source PW Server: ${SOURCE_GUILD_ID}`);
  console.log(`Target Zenji Server: ${TARGET_GUILD_ID}\n`);

  // 1. Fetch Source Roles & Channels
  console.log(`📡 Fetching source server roles...`);
  const rolesRes = await fetchWithRetry(`/guilds/${SOURCE_GUILD_ID}/roles`);
  if (rolesRes.status !== 200) {
    console.error(`Failed to fetch source roles: ${rolesRes.status}`);
    return;
  }
  const sourceRoles = rolesRes.data.filter(r => r.name !== '@everyone' && !r.managed);
  console.log(`Found ${sourceRoles.length} roles to clone.`);

  console.log(`📡 Fetching source server channels...`);
  const channelsRes = await fetchWithRetry(`/guilds/${SOURCE_GUILD_ID}/channels`);
  if (channelsRes.status !== 200) {
    console.error(`Failed to fetch source channels: ${channelsRes.status}`);
    return;
  }
  const sourceChannels = channelsRes.data;
  console.log(`Found ${sourceChannels.length} channels to clone.\n`);

  // 2. Clone Roles
  console.log(`🎨 Creating Roles in Target Server...`);
  const roleMap = new Map(); // sourceRoleId -> targetRoleId

  for (const role of sourceRoles) {
    console.log(`  Creating role: ${role.name}...`);
    const res = await fetchWithRetry(`/guilds/${TARGET_GUILD_ID}/roles`, 'POST', {
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
    });

    if (res.status === 200 || res.status === 201) {
      roleMap.set(role.id, res.data.id);
      console.log(`   ✅ Created role ${role.name}`);
    } else {
      console.log(`   ❌ Failed (${res.status})`);
    }
    await sleep(1000);
  }

  // 3. Separate Categories and Normal Channels
  const categories = sourceChannels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  const otherChannels = sourceChannels.filter(c => c.type !== 4).sort((a, b) => a.position - b.position);

  const categoryMap = new Map(); // sourceCatId -> targetCatId

  // 4. Create Categories
  console.log(`\n📁 Creating Categories...`);
  for (const cat of categories) {
    console.log(`  Creating Category: ${cat.name}...`);
    const res = await fetchWithRetry(`/guilds/${TARGET_GUILD_ID}/channels`, 'POST', {
      name: cat.name,
      type: 4,
      position: cat.position,
    });

    if (res.status === 200 || res.status === 201) {
      categoryMap.set(cat.id, res.data.id);
      console.log(`   ✅ Created Category ${cat.name}`);
    } else {
      console.log(`   ❌ Failed (${res.status})`);
    }
    await sleep(1000);
  }

  // 5. Create Text / Voice Channels
  console.log(`\n💬 Creating Text & Voice Channels...`);
  for (const ch of otherChannels) {
    const parentId = ch.parent_id ? categoryMap.get(ch.parent_id) : null;
    console.log(`  Creating Channel: #${ch.name}...`);

    const payload = {
      name: ch.name,
      type: ch.type, // 0 = text, 2 = voice, 5 = announcement, etc.
      position: ch.position,
      topic: ch.topic || undefined,
      nsfw: ch.nsfw || false,
      bitrate: ch.bitrate || undefined,
      user_limit: ch.user_limit || undefined,
    };
    if (parentId) payload.parent_id = parentId;

    const res = await fetchWithRetry(`/guilds/${TARGET_GUILD_ID}/channels`, 'POST', payload);

    if (res.status === 200 || res.status === 201) {
      console.log(`   ✅ Created Channel #${ch.name}`);
    } else {
      console.log(`   ❌ Failed (${res.status})`);
    }
    await sleep(1000);
  }

  console.log(`\n🎉 SERVER CLONING COMPLETE! All roles, categories, and channels have been cloned to Zenji Server.`);
}

cloneServer().catch(console.error);
