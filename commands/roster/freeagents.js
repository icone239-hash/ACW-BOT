const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('free-agents')
    .setDescription('Lists all players without a team'),
  async execute(interaction) {
    try {
      const players = db.getFreeAgents();
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Free Agents');

      if (!players || players.length === 0) {
        embed.setDescription('There are currently no free agents.');
      } else {
        let desc = '';
        players.forEach(p => {
          desc += `<@${p.discordId}>\n`;
        });
        embed.setDescription(desc);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch free agents.')], ephemeral: true });
    }
  }
};
