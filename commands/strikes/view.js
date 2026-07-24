const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strikes-view')
    .setDescription('Shows all active strikes for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user')
        .setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');

    try {
      const strikes = db.getUserStrikes(user.id);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`Strikes for ${user.username}`);

      if (!strikes || strikes.length === 0) {
        embed.setDescription('This user has no active strikes.');
      } else {
        let desc = `Total strikes: **${strikes.length}**\n\n`;
        strikes.reverse().forEach(s => {
          desc += `• **Reason**: ${s.reason}\n`;
        });
        embed.setDescription(desc);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch strikes.')], ephemeral: true });
    }
  }
};
