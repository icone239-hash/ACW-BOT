// commands/config/toplist-hm.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { readTopListData, writeTopListData, updateTopListMessage } = require('../../utils/topListHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toplist-hm')
    .setDescription('Add or remove Honorable Mentions in the official ACW top lists (Admin only)')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Select the list category')
        .setRequired(true)
        .addChoices(
          { name: 'WR List', value: 'wr' },
          { name: 'QB List', value: 'qb' }
        ))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Add or remove the item')
        .setRequired(true)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' }
        ))
    .addStringOption(option =>
      option.setName('item-text')
        .setDescription('The text or name to add/remove (optional)')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('item-user')
        .setDescription('Select a user to add/remove (optional)')
        .setRequired(false)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to edit Honorable Mentions.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const category = interaction.options.getString('category');
    const action = interaction.options.getString('action');
    const itemText = interaction.options.getString('item-text');
    const itemUser = interaction.options.getUser('item-user');

    if (!itemText && !itemUser) {
      return interaction.editReply({
        embeds: [errorEmbed('Input Error', 'You must specify either `item-text` or `item-user`.')]
      });
    }

    const value = itemUser ? `<@${itemUser.id}>` : itemText;

    try {
      const topListData = readTopListData();

      if (!topListData[category]) {
        topListData[category] = { items: [], hm: [] };
      }

      if (!topListData[category].hm) {
        topListData[category].hm = [];
      }

      const hmList = topListData[category].hm;

      if (action === 'add') {
        if (hmList.includes(value)) {
          return interaction.editReply({
            embeds: [errorEmbed('Input Error', `**${value}** is already in the Honorable Mentions list.`)]
          });
        }
        hmList.push(value);
      } else {
        const index = hmList.indexOf(value);
        if (index === -1) {
          return interaction.editReply({
            embeds: [errorEmbed('Input Error', `**${value}** was not found in the Honorable Mentions list.`)]
          });
        }
        hmList.splice(index, 1);
      }

      topListData[category].hm = hmList;
      writeTopListData(topListData);

      // Trigger message update in live channel
      await updateTopListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Honorable Mentions Updated', `Successfully **${action}ed** **${value}** to/from **${category.toUpperCase()}** Honorable Mentions.`)]
      });

    } catch (err) {
      console.error('[TOPLIST-HM] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to edit Honorable Mentions: ${err.message}`)]
      });
    }
  }
};
