// commands/config/toplist-edit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { readTopListData, writeTopListData, updateTopListMessage } = require('../../utils/topListHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toplist-edit')
    .setDescription('Edit an item on the official ACW top list (Admin only)')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Select the list category')
        .setRequired(true)
        .addChoices(
          { name: 'WR List', value: 'wr' },
          { name: 'QB List', value: 'qb' },
          { name: 'Standout Players', value: 'standout' },
          { name: 'Preseason Champ', value: 'champ' },
          { name: 'Preseason MVP', value: 'mvp' }
        ))
    .addIntegerOption(option =>
      option.setName('rank')
        .setDescription('The rank position to edit (e.g. 1, 2, 3...)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('item-text')
        .setDescription('The text or crew name to place (optional)')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('item-user')
        .setDescription('Select a user to place (optional)')
        .setRequired(false)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to edit the top list.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const category = interaction.options.getString('category');
    const rank = interaction.options.getInteger('rank');
    const itemText = interaction.options.getString('item-text');
    const itemUser = interaction.options.getUser('item-user');

    if (!itemText && !itemUser) {
      return interaction.editReply({
        embeds: [errorEmbed('Input Error', 'You must specify either `item-text` or `item-user`.')]
      });
    }

    // Resolve the value to save
    const saveValue = itemUser ? `<@${itemUser.id}>` : itemText;

    try {
      const topListData = readTopListData();

      if (!topListData[category]) {
        topListData[category] = { items: [], hm: [] };
      }

      const items = topListData[category].items || [];

      // Validate rank limits
      if (rank < 1 || rank > 50) {
        return interaction.editReply({
          embeds: [errorEmbed('Validation Error', 'Rank must be between 1 and 50.')]
        });
      }

      // Update the index (rank - 1)
      items[rank - 1] = saveValue;

      // Clean up any empty entries/nulls before the new rank
      for (let i = 0; i < rank - 1; i++) {
        if (items[i] === undefined || items[i] === null) {
          items[i] = 'TBD';
        }
      }

      topListData[category].items = items;
      writeTopListData(topListData);

      // Trigger message update in live channel
      await updateTopListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Top List Updated', `Set **#${rank}** in **${category.toUpperCase()}** to **${saveValue}**.`)]
      });

    } catch (err) {
      console.error('[TOPLIST-EDIT] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to edit top list: ${err.message}`)]
      });
    }
  }
};
