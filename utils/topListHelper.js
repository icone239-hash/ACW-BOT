// utils/topListHelper.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOP_LIST_DB_PATH = path.join(__dirname, '../data/toplist.json');
const TOP_LIST_MSG_REF_PATH = path.join(__dirname, '../data/toplist_msg.json');

function readTopListData() {
  try {
    if (!fs.existsSync(TOP_LIST_DB_PATH)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(TOP_LIST_DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeTopListData(data) {
  fs.writeFileSync(TOP_LIST_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readMsgRef() {
  try {
    if (!fs.existsSync(TOP_LIST_MSG_REF_PATH)) return {};
    return JSON.parse(fs.readFileSync(TOP_LIST_MSG_REF_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeMsgRef(data) {
  fs.writeFileSync(TOP_LIST_MSG_REF_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function buildTopListEmbed(category = 'all', guild) {
  const topListData = readTopListData();

  const embed = new EmbedBuilder()
    .setColor('#FEE75C') // Matches yellow ticket colors
    .setAuthor({ 
      name: 'ACW S1 | Official Top List', 
      iconURL: guild ? guild.iconURL({ dynamic: true }) : null 
    })
    .setTimestamp();

  if (category === 'all') {
    embed.setTitle('🏆 ACW Preseason Official Top List');
    
    // WR Field
    const wrItems = topListData.wr?.items || [];
    const wrHmList = topListData.wr?.hm || [];
    const wrLines = wrItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n') || 'None';
    const wrHm = `**HM:** ${wrHmList.join(', ') || 'None'}`;
    embed.addFields({ name: '🏈 WR LIST (1-10)', value: `${wrLines}\n${wrHm}` });

    // QB Field
    const qbItems = topListData.qb?.items || [];
    const qbHmList = topListData.qb?.hm || [];
    const qbLines = qbItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n') || 'None';
    const qbHm = `**HM:** ${qbHmList.join(', ') || 'None'}`;
    embed.addFields({ name: '🎯 QB LIST (1-5)', value: `${qbLines}\n${qbHm}` });

    // Standout Field
    const standoutItems = topListData.standout?.items || [];
    const standoutLines = standoutItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n') || 'None';
    embed.addFields({ name: '⭐ STANDOUT UNKNOWN PRESEASON PLAYERS (1-6)', value: standoutLines });

    // Champ & MVP Field
    const champItems = topListData.champ?.items || ['None'];
    const mvpItems = topListData.mvp?.items || ['None'];
    embed.addFields(
      { name: '👑 PRESEASON CHAMP', value: `1. ${champItems[0]}`, inline: true },
      { name: '🥇 PRESEASON MVP', value: `1. ${mvpItems[0]}`, inline: true }
    );
  } else if (category === 'wr') {
    embed.setTitle('🏈 WR Top List (1-10) & Honorable Mentions');
    const wrItems = topListData.wr?.items || [];
    const wrHmList = topListData.wr?.hm || [];
    const wrLines = wrItems.map((item, idx) => `**${idx + 1}.** ${item}`).join('\n') || 'None';
    const wrHm = `**Honorable Mentions:** ${wrHmList.join(', ') || 'None'}`;
    embed.setDescription(`${wrLines}\n\n${wrHm}`);
  } else if (category === 'qb') {
    embed.setTitle('🎯 QB Top List (1-5) & Honorable Mentions');
    const qbItems = topListData.qb?.items || [];
    const qbHmList = topListData.qb?.hm || [];
    const qbLines = qbItems.map((item, idx) => `**${idx + 1}.** ${item}`).join('\n') || 'None';
    const qbHm = `**Honorable Mentions:** ${qbHmList.join(', ') || 'None'}`;
    embed.setDescription(`${qbLines}\n\n${qbHm}`);
  } else if (category === 'standout') {
    embed.setTitle('⭐ Standout Unknown Preseason Players (1-6)');
    const standoutItems = topListData.standout?.items || [];
    const lines = standoutItems.map((item, idx) => `**${idx + 1}.** ${item}`).join('\n') || 'None';
    embed.setDescription(lines);
  } else if (category === 'champ') {
    embed.setTitle('👑 Preseason Champion');
    const champItems = topListData.champ?.items || ['None'];
    embed.setDescription(`**1.** ${champItems[0]}`);
  } else if (category === 'mvp') {
    embed.setTitle('🥇 Preseason MVP');
    const mvpItems = topListData.mvp?.items || ['None'];
    embed.setDescription(`**1.** ${mvpItems[0]}`);
  }

  return embed;
}

function buildTopListDropdown(selectedCategory = 'all') {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('select_top_list_category')
    .setPlaceholder('Filter by category...')
    .addOptions([
      {
        label: 'Full Top List (All Categories)',
        value: 'all',
        description: 'View complete preseason rankings and awards',
        emoji: '🏆',
        default: selectedCategory === 'all'
      },
      {
        label: 'WR List (1-10 & HM)',
        value: 'wr',
        description: 'Top 10 Wide Receivers & Honorable Mentions',
        emoji: '🏈',
        default: selectedCategory === 'wr'
      },
      {
        label: 'QB List (1-5 & HM)',
        value: 'qb',
        description: 'Top 5 Quarterbacks & Honorable Mentions',
        emoji: '🎯',
        default: selectedCategory === 'qb'
      },
      {
        label: 'Standout Players (1-6)',
        value: 'standout',
        description: 'Top 6 Standout Unknown Preseason Players',
        emoji: '⭐',
        default: selectedCategory === 'standout'
      },
      {
        label: 'Preseason Champ',
        value: 'champ',
        description: 'Preseason Champion Crew',
        emoji: '👑',
        default: selectedCategory === 'champ'
      },
      {
        label: 'Preseason MVP',
        value: 'mvp',
        description: 'Preseason Most Valuable Player',
        emoji: '🥇',
        default: selectedCategory === 'mvp'
      }
    ]);

  return new ActionRowBuilder().addComponents(menu);
}

async function updateTopListMessage(guild) {
  if (!guild) return;
  try {
    const config = require('../config.json');
    const channelId = config.channels?.topList || '1526005799933968444';
    const channel = guild.channels.cache.get(channelId) || 
                    guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('toplist') || c.name.includes('top-list')));

    if (!channel) {
      console.warn('[TopList] No top-list channel found.');
      return;
    }

    // Auto-extract and cache any user IDs mentioned to ensure they display handles correctly
    const topListData = readTopListData();
    const rawDataStr = JSON.stringify(topListData);
    const userIds = [...rawDataStr.matchAll(/<@!?(\d+)>/g)].map(match => match[1]);
    for (const uid of userIds) {
      await guild.members.fetch(uid).catch(() => {});
    }

    const embed = buildTopListEmbed('all', guild);
    const row = buildTopListDropdown('all');
    const ref = readMsgRef();

    let message = null;
    if (ref.channelId === channel.id && ref.messageId) {
      message = await channel.messages.fetch(ref.messageId).catch(() => null);
    }

    let edited = false;
    if (message) {
      try {
        await message.edit({
          embeds: [embed],
          components: [row]
        });
        console.log('[TopList] Updated existing Top List message.');
        edited = true;
      } catch (editErr) {
        console.warn('[TopList] Failed to edit existing message, sending a new one:', editErr.message);
        await message.delete().catch(() => null);
      }
    }

    if (!edited) {
      const newMsg = await channel.send({
        embeds: [embed],
        components: [row]
      });
      writeMsgRef({ channelId: channel.id, messageId: newMsg.id });
      console.log('[TopList] Posted new Top List message.');
    }

  } catch (err) {
    console.error('[TopList] Error updating message:', err);
  }
}

module.exports = {
  readTopListData,
  writeTopListData,
  buildTopListEmbed,
  buildTopListDropdown,
  updateTopListMessage
};
