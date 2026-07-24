// commands/general/top.js
const { SlashCommandBuilder } = require('discord.js');
const { buildTopListEmbed, buildTopListDropdown } = require('../../utils/topListHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('View the official ACW preseason top list and category rankings')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Select a specific category to view')
        .setRequired(false)
        .addChoices(
          { name: 'Full Top List', value: 'all' },
          { name: 'WR List (1-10 & HM)', value: 'wr' },
          { name: 'QB List (1-5 & HM)', value: 'qb' },
          { name: 'Standout Players (1-6)', value: 'standout' },
          { name: 'Preseason Champ', value: 'champ' },
          { name: 'Preseason MVP', value: 'mvp' }
        )
    ),

  async execute(interaction) {
    const category = interaction.options.getString('category') || 'all';

    const embed = buildTopListEmbed(category, interaction.guild);
    const row = buildTopListDropdown(category);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
