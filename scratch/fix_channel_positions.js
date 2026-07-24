// scratch/fix_channel_positions.js
// Re-clones channels and categories from the source guild to the target guild, ensuring the exact position (order) is preserved.

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const config = require('../config.json');

const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_GUILD_ID = '1525985063143997691';
const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

async function apiFetch(endpoint) {
  const res = await fetch(`https://discord.com/api/v9${endpoint}`, {
    headers: {
      Authorization: USER_TOKEN
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API ${res.status}: ${errText}`);
  }
  return res.json();
}

client.once('ready', async () => {
  console.log(`Logged in as bot: ${client.user.tag}`);

  try {
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!targetGuild) {
      console.error(`❌ Target server (ID: ${TARGET_GUILD_ID}) not found.`);
      process.exit(1);
    }

    console.log('Fetching source server roles and channels...');
    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    const sChannels = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/channels`);

    // Build role mapping
    const targetRoles = await targetGuild.roles.fetch();
    const roleMap = new Map();

    // Map everyone role
    const sourceEveryone = sRoles.find(r => r.name === '@everyone' || r.id === SOURCE_GUILD_ID);
    if (sourceEveryone) {
      roleMap.set(sourceEveryone.id, targetGuild.roles.everyone.id);
    }

    // Map other roles by name
    for (const sRole of sRoles) {
      if (sRole.name !== '@everyone' && sRole.id !== SOURCE_GUILD_ID) {
        const matchingTargetRole = targetRoles.find(r => r.name === sRole.name);
        if (matchingTargetRole) {
          roleMap.set(sRole.id, matchingTargetRole.id);
        }
      }
    }

    console.log('Step 1: Deleting existing channels in target guild...');
    const targetChannels = await targetGuild.channels.fetch();
    for (const [, channel] of targetChannels) {
      if (channel) {
        console.log(`Deleting target channel: ${channel.name}`);
        await channel.delete('Re-ordering').catch(e => console.warn(`Could not delete channel ${channel.name}: ${e.message}`));
      }
    }

    // Helper to map overwrites
    function mapOverwrites(overwrites) {
      if (!overwrites) return [];
      return overwrites.map(ow => {
        const mappedId = roleMap.get(ow.id) || ow.id;
        return {
          id: mappedId,
          type: ow.type === 0 ? 0 : 1,
          allow: BigInt(ow.allow),
          deny: BigInt(ow.deny)
        };
      });
    }

    // Sort categories by position (lowest first)
    const categories = sChannels
      .filter(c => c.type === 4)
      .sort((a, b) => a.position - b.position);

    // Sort text/voice channels by position (lowest first)
    const textAndVoice = sChannels
      .filter(c => c.type !== 4)
      .sort((a, b) => a.position - b.position);

    const categoryMap = new Map(); // sourceCategoryId -> targetCategoryId

    console.log(`Step 2: Re-creating ${categories.length} categories in exact order...`);
    for (const cat of categories) {
      try {
        const newCat = await targetGuild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          position: cat.position,
          permissionOverwrites: mapOverwrites(cat.permission_overwrites)
        });
        categoryMap.set(cat.id, newCat.id);
        console.log(`✅ Cloned category (Pos: ${cat.position}): ${cat.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone category ${cat.name}: ${err.message}`);
      }
    }

    console.log(`Step 3: Re-creating ${textAndVoice.length} channels in exact order...`);
    for (const chan of textAndVoice) {
      try {
        const parentId = chan.parent_id ? categoryMap.get(chan.parent_id) : null;
        await targetGuild.channels.create({
          name: chan.name,
          type: chan.type === 0 ? ChannelType.GuildText : chan.type === 2 ? ChannelType.GuildVoice : chan.type,
          parent: parentId,
          position: chan.position,
          topic: chan.topic || null,
          nsfw: chan.nsfw || false,
          bitrate: chan.bitrate || undefined,
          userLimit: chan.user_limit || undefined,
          rateLimitPerUser: chan.rate_limit_per_user || undefined,
          permissionOverwrites: mapOverwrites(chan.permission_overwrites)
        });
        console.log(`✅ Cloned channel (Pos: ${chan.position}): ${chan.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone channel ${chan.name}: ${err.message}`);
      }
    }

    console.log('🎉 Guild channels re-ordered and cloned successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Re-ordering failed:', error);
    process.exit(1);
  }
});

client.login(config.token);
