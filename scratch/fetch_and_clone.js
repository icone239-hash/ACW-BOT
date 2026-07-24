// scratch/fetch_and_clone.js
// Clones roles, categories, and channels from the source guild to the target guild using user token to read and bot client to write.

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
      console.error(`❌ Target server (ID: ${TARGET_GUILD_ID}) not found. make sure bot is in the server!`);
      process.exit(1);
    }

    console.log('Step 1: Fetching source server roles and channels using user token...');
    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    const sChannels = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/channels`);

    console.log(`Fetched ${sRoles.length} roles and ${sChannels.length} channels from source guild.`);

    // ==========================================
    // STEP 2: CLEAN TARGET GUILD
    // ==========================================
    console.log('Step 2: Cleaning target guild channels...');
    const targetChannels = await targetGuild.channels.fetch();
    for (const [, channel] of targetChannels) {
      if (channel) {
        console.log(`Deleting target channel: ${channel.name}`);
        await channel.delete('Cloning clean').catch(e => console.warn(`Could not delete channel ${channel.name}: ${e.message}`));
      }
    }

    console.log('Cleaning target guild roles...');
    const targetRoles = await targetGuild.roles.fetch();
    const botMember = await targetGuild.members.fetch(client.user.id);
    const highestBotRoleRawPosition = botMember.roles.highest.rawPosition;

    for (const [, role] of targetRoles) {
      if (
        role.id !== targetGuild.roles.everyone.id &&
        !role.managed &&
        role.rawPosition < highestBotRoleRawPosition
      ) {
        console.log(`Deleting target role: ${role.name}`);
        await role.delete('Cloning clean').catch(e => console.warn(`Could not delete role ${role.name}: ${e.message}`));
      }
    }

    // ==========================================
    // STEP 3: CLONE ROLES & MAP THEM
    // ==========================================
    console.log('Step 3: Cloning roles...');
    const roleMap = new Map(); // sourceRoleId -> targetRoleId

    // Find everyone role IDs
    const sourceEveryone = sRoles.find(r => r.name === '@everyone' || r.id === SOURCE_GUILD_ID);
    if (sourceEveryone) {
      roleMap.set(sourceEveryone.id, targetGuild.roles.everyone.id);
    }

    // Sort roles by position (lowest first) to build hierarchy correctly
    const sortedRoles = sRoles
      .filter(r => r.name !== '@everyone' && r.id !== SOURCE_GUILD_ID && !r.managed)
      .sort((a, b) => a.position - b.position);

    for (const sRole of sortedRoles) {
      try {
        const newRole = await targetGuild.roles.create({
          name: sRole.name,
          color: sRole.color,
          hoist: sRole.hoist,
          mentionable: sRole.mentionable,
          permissions: BigInt(sRole.permissions),
          reason: `Clone of ${sRole.name}`
        });
        roleMap.set(sRole.id, newRole.id);
        console.log(`✅ Cloned role: ${sRole.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone role ${sRole.name}: ${err.message}`);
      }
    }

    // ==========================================
    // STEP 4: CLONE CATEGORIES & CHANNELS
    // ==========================================
    console.log('Step 4: Cloning channels and categories...');

    function mapOverwrites(overwrites) {
      if (!overwrites) return [];
      return overwrites.map(ow => {
        const mappedId = roleMap.get(ow.id) || ow.id; // Map source role ID to target role ID
        return {
          id: mappedId,
          type: ow.type === 0 ? 0 : 1, // 0 is OverwriteType.Role, 1 is OverwriteType.Member
          allow: BigInt(ow.allow),
          deny: BigInt(ow.deny)
        };
      });
    }

    // Sort: categories first, text/voice channels second
    const categories = sChannels.filter(c => c.type === 4); // Category
    const textAndVoice = sChannels.filter(c => c.type !== 4);

    const categoryMap = new Map(); // sourceCategoryId -> targetCategoryId

    console.log(`Cloning ${categories.length} categories...`);
    for (const cat of categories) {
      try {
        const newCat = await targetGuild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: mapOverwrites(cat.permission_overwrites)
        });
        categoryMap.set(cat.id, newCat.id);
        console.log(`✅ Cloned category: ${cat.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone category ${cat.name}: ${err.message}`);
      }
    }

    console.log(`Cloning ${textAndVoice.length} channels...`);
    for (const chan of textAndVoice) {
      try {
        const parentId = chan.parent_id ? categoryMap.get(chan.parent_id) : null;
        await targetGuild.channels.create({
          name: chan.name,
          type: chan.type === 0 ? ChannelType.GuildText : chan.type === 2 ? ChannelType.GuildVoice : chan.type,
          parent: parentId,
          topic: chan.topic || null,
          nsfw: chan.nsfw || false,
          bitrate: chan.bitrate || undefined,
          userLimit: chan.user_limit || undefined,
          rateLimitPerUser: chan.rate_limit_per_user || undefined,
          permissionOverwrites: mapOverwrites(chan.permission_overwrites)
        });
        console.log(`✅ Cloned channel: ${chan.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone channel ${chan.name}: ${err.message}`);
      }
    }

    console.log('🎉 Guild clone process complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Cloning failed:', error);
    process.exit(1);
  }
});

client.login(config.token);
