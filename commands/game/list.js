const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game-list')
    .setDescription('Lists all upcoming scheduled games'),
  async execute(interaction) {
    try {
      const games = db.getGames().filter(g => g.status === 'scheduled');
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Scheduled Games');

      if (!games || games.length === 0) {
        embed.setDescription('There are no scheduled games at the moment.');
      } else {
        let desc = '';
        games.forEach(g => {
          const t1 = db.getTeamById(g.team1Id);
          const t2 = db.getTeamById(g.team2Id);
          desc += `**[ID: ${g.id}]** ${t1 ? t1.name : 'Unknown'} vs ${t2 ? t2.name : 'Unknown'} - ${g.scheduledAt}\n`;
        });
        embed.setDescription(desc);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch scheduled games.')], ephemeral: true });
    }
  }
};
