// utils/crewListMessage.js
// Handles posting and editing the live crew list message in the crew-list channel

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
const MSG_REF_PATH  = path.join(__dirname, '../data/crewlist_message.json');

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
}

function readMsgRef() {
  try { return JSON.parse(fs.readFileSync(MSG_REF_PATH, 'utf8')); }
  catch { return {}; }
}

function writeMsgRef(data) {
  fs.writeFileSync(MSG_REF_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function buildCrewListEmbed(guild, activeMembers = new Set()) {
  const crewList = readCrewList();

  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
  const maxCrews = config.maxCrews || 34;

  const embed = new EmbedBuilder()
    .setColor('#ED4245')
    .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: guild.iconURL({ dynamic: true }) })
    .setTitle(`ACW Crew List (${crewList.length}/${maxCrews})`)
    .setTimestamp()
    .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) });

  if (crewList.length === 0) {
    embed.setDescription('No teams have been added yet. Use `/team addteam` to get started.');
    return embed;
  }

  // Single vertical list in description: @TeamRole — Owner
  const lines = crewList.map(entry => {
    let teamDisplay = `**${entry.team}**`;
    if (entry.roleId && guild.roles.cache.has(entry.roleId)) {
      teamDisplay = `<@&${entry.roleId}>`;
    }

    let ownerDisplay = 'Unknown';
    if (entry.ownerId && activeMembers.has(entry.ownerId)) {
      ownerDisplay = `<@${entry.ownerId}>`;
    } else {
      let handle = entry.ownerHandle || entry.ownerTag || 'Unknown';
      if (typeof handle === 'string' && handle.startsWith('<@')) {
        handle = 'Unknown';
      }
      ownerDisplay = String(handle).startsWith('@') ? String(handle) : `@${handle}`;
    }

    return `${teamDisplay} — ${ownerDisplay}`;
  });

  embed.setDescription(lines.join('\n'));

  return embed;
}


/**
 * Finds the crew-list channel, then either edits the existing pinned message
 * or sends a new one and saves the message reference.
 */
async function updateCrewListMessage(guild) {
  if (!guild) return;
  try {
    const crewList = readCrewList();
    const activeMembers = new Set();

    // Fetch roles & all owner member profiles into cache individually to check guild status
    await guild.roles.fetch().catch(() => {});
    for (const entry of crewList) {
      if (entry.ownerId) {
        try {
          await guild.members.fetch(entry.ownerId);
          activeMembers.add(entry.ownerId);
        } catch {
          // Member not in guild
        }
      }
    }

    // Find the crew-list channel by name
    const channel = guild.channels.cache.find(c =>
      c.isTextBased() && (
        c.name.includes('crew-list') ||
        c.name.includes('crewlist') ||
        c.name.includes('crew_list')
      )
    );

    if (!channel) {
      console.warn('[CREWLIST] No crew-list channel found. Create a channel named "crew-list".');
      return;
    }

    const embed = buildCrewListEmbed(guild, activeMembers);
    const ref = readMsgRef();

    // Try to edit the existing message
    if (ref.channelId === channel.id && ref.messageId) {
      try {
        const existing = await channel.messages.fetch(ref.messageId);
        await existing.edit({ embeds: [embed] });
        console.log('[CREWLIST] Updated existing crew list message with clickable mentions.');
        return;
      } catch (editErr) {
        console.warn('[CREWLIST] Failed to edit existing message, sending a new one:', editErr.message);
        try {
          const existing = await channel.messages.fetch(ref.messageId).catch(() => null);
          if (existing) {
            await existing.delete().catch(() => null);
          }
        } catch {}
      }
    }

    // Send a new message and save the reference
    const msg = await channel.send({ embeds: [embed] });
    writeMsgRef({ channelId: channel.id, messageId: msg.id });
    console.log(`[CREWLIST] Sent new crew list message (${msg.id})`);

  } catch (err) {
    console.error('[CREWLIST] Failed to update crew list message:', err.message);
  }
}

module.exports = { updateCrewListMessage, buildCrewListEmbed };
