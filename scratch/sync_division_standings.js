// scratch/sync_division_standings.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_CHANNEL_ID = '1524510099698090136';
const TARGET_CHANNEL_ID = '1528944558065324062';
const SOURCE_GUILD_ID = '1525985063143997691';
const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function apiFetch(endpoint) {
  const res = await fetch(`https://discord.com/api/v9${endpoint}`, {
    headers: { Authorization: USER_TOKEN }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
  }
  return res.json();
}

client.once('ready', async () => {
  try {
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    const targetChannel = client.channels.cache.get(TARGET_CHANNEL_ID);

    if (!targetGuild || !targetChannel) {
      console.error('Target guild or channel not found.');
      process.exit(1);
    }

    console.log('Fetching source roles and messages...');
    const sRoles = await apiFetch(`/guilds/${SOURCE_GUILD_ID}/roles`);
    const sourceRolesMap = new Map(sRoles.map(r => [r.id, r.name]));

    const targetRoles = await targetGuild.roles.fetch();

    const messages = await apiFetch(`/channels/${SOURCE_CHANNEL_ID}/messages?limit=5`);
    const sourceMessage = messages.find(m => m.embeds && m.embeds.length > 0);

    if (!sourceMessage) {
      console.error('No embed message found in source channel.');
      process.exit(1);
    }

    console.log(`Replicating ${sourceMessage.embeds.length} embeds from source...`);

    const clonedEmbeds = [];

    for (const sEmbed of sourceMessage.embeds) {
      let description = sEmbed.description || '';

      // Match all role mentions <@&ROLE_ID>
      const roleMentionRegex = /<@&(\d+)>/g;
      let match;
      const replacements = [];

      while ((match = roleMentionRegex.exec(description)) !== null) {
        const sourceRoleId = match[1];
        const roleName = sourceRolesMap.get(sourceRoleId);

        if (roleName) {
          // Find or create in target guild
          let targetRole = targetRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
          if (!targetRole) {
            targetRole = await targetGuild.roles.create({
              name: roleName,
              color: '#3498db',
              hoist: true,
              mentionable: true,
              reason: 'Sync Division Standings'
            });
            console.log(`✅ Created missing role "${roleName}": ${targetRole.id}`);
          }
          replacements.push({ source: `<@&${sourceRoleId}>`, target: `<@&${targetRole.id}>` });
        }
      }

      // Apply replacements
      replacements.forEach(r => {
        description = description.replaceAll(r.source, r.target);
      });

      const newEmbed = new EmbedBuilder()
        .setColor(sEmbed.color || '#5865F2')
        .setTitle(sEmbed.title || null)
        .setDescription(description || null)
        .setTimestamp();

      clonedEmbeds.push(newEmbed);
    }

    // Clear old messages in target channel first
    console.log('Cleaning target channel...');
    const fetched = await targetChannel.messages.fetch({ limit: 50 });
    for (const msg of fetched.values()) {
      await msg.delete().catch(() => {});
    }

    // Post the exact layout message containing the embeds
    await targetChannel.send({
      embeds: clonedEmbeds
    });

    console.log('🎉 Division standings embed synced successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
