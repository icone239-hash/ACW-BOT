// scratch/clone_server.js
// Clones roles, categories, and channels from the source guild to the target guild.

const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

const SOURCE_GUILD_ID = '1525985063143997691';
const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const sourceGuild = client.guilds.cache.get(SOURCE_GUILD_ID);
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);

    if (!sourceGuild) {
      console.error(`❌ Source server (ID: ${SOURCE_GUILD_ID}) not found. Make sure the bot is invited to the source server first!`);
      process.exit(1);
    }
    if (!targetGuild) {
      console.error(`❌ Target server (ID: ${TARGET_GUILD_ID}) not found.`);
      process.exit(1);
    }

    console.log(`Cloning from "${sourceGuild.name}" to "${targetGuild.name}"...`);

    // ==========================================
    // STEP 1: CLEAN TARGET GUILD (except bot roles/essential channels)
    // ==========================================
    console.log('Cleaning target guild channels...');
    const targetChannels = await targetGuild.channels.fetch();
    for (const [, channel] of targetChannels) {
      if (channel) {
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
        await role.delete('Cloning clean').catch(e => console.warn(`Could not delete role ${role.name}: ${e.message}`));
      }
    }

    // ==========================================
    // STEP 2: CLONE ROLES & MAP THEM
    // ==========================================
    console.log('Fetching source roles...');
    const sourceRoles = await sourceGuild.roles.fetch();
    const roleMap = new Map(); // sourceRoleId -> targetRoleId

    // Map everyone role
    roleMap.set(sourceGuild.roles.everyone.id, targetGuild.roles.everyone.id);

    // Sort source roles by rawPosition (lowest first) to create in hierarchy order
    const sortedRoles = [...sourceRoles.values()]
      .filter(r => r.id !== sourceGuild.roles.everyone.id && !r.managed)
      .sort((a, b) => a.rawPosition - b.rawPosition);

    console.log(`Cloning ${sortedRoles.length} roles...`);
    for (const sRole of sortedRoles) {
      try {
        const newRole = await targetGuild.roles.create({
          name: sRole.name,
          color: sRole.color,
          hoist: sRole.hoist,
          mentionable: sRole.mentionable,
          permissions: sRole.permissions,
          reason: `Clone from source role: ${sRole.name}`
        });
        roleMap.set(sRole.id, newRole.id);
        console.log(`✅ Cloned role: ${sRole.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone role ${sRole.name}: ${err.message}`);
      }
    }

    // ==========================================
    // STEP 3: CLONE CATEGORIES & CHANNELS
    // ==========================================
    console.log('Fetching source channels...');
    const sourceChannels = await sourceGuild.channels.fetch();

    // Helper to map overwrites
    function mapOverwrites(overwrites) {
      return [...overwrites.values()].map(ow => {
        const mappedId = roleMap.get(ow.id) || ow.id; // Map role ID or keep user ID
        return {
          id: mappedId,
          type: ow.type,
          allow: ow.allow,
          deny: ow.deny
        };
      });
    }

    // Sort: categories first, then normal channels
    const categories = [...sourceChannels.values()].filter(c => c.type === ChannelType.GuildCategory);
    const textAndVoice = [...sourceChannels.values()].filter(c => c.type !== ChannelType.GuildCategory);

    const categoryMap = new Map(); // sourceCategoryId -> targetCategoryId

    console.log(`Cloning ${categories.length} categories...`);
    for (const cat of categories) {
      try {
        const newCat = await targetGuild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: mapOverwrites(cat.permissionOverwrites)
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
        const parentId = chan.parentId ? categoryMap.get(chan.parentId) : null;
        await targetGuild.channels.create({
          name: chan.name,
          type: chan.type,
          parent: parentId,
          topic: chan.topic || null,
          nsfw: chan.nsfw || false,
          bitrate: chan.bitrate || undefined,
          userLimit: chan.userLimit || undefined,
          rateLimitPerUser: chan.rateLimitPerUser || undefined,
          permissionOverwrites: mapOverwrites(chan.permissionOverwrites)
        });
        console.log(`✅ Cloned channel: ${chan.name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to clone channel ${chan.name}: ${err.message}`);
      }
    }

    console.log('🎉 Server replication complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Cloning failed:', error);
    process.exit(1);
  }
});

client.login(config.token);
