const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team-list')
    .setDescription('Lists all teams'),
  async execute(interaction) {
    try {
      const teams = db.getTeams();
      teams.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
      
      if (!teams || teams.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('No Teams', 'There are no teams in the league yet.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('League Teams');

      let desc = '';
      teams.forEach(team => {
        desc += `**${team.name}** - Record: ${team.wins}-${team.losses}-${team.ties}\n`;
      });

      embed.setDescription(desc);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch teams.')], ephemeral: true });
    }
  }
};
