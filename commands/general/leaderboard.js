const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows top 10 players sorted by touchdowns'),
  async execute(interaction) {
    try {
      const players = db.getPlayers();
      players.sort((a, b) => b.touchdowns - a.touchdowns);
      
      const top10 = players.slice(0, 10);
      
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Top 10 Players (Touchdowns)');

      if (!top10 || top10.length === 0) {
        embed.setDescription('No player data available.');
      } else {
        let desc = '';
        top10.forEach((p, index) => {
          desc += `**${index + 1}.** <@${p.discordId}> - ${p.touchdowns} TDs\n`;
        });
        embed.setDescription(desc);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch leaderboard.')], ephemeral: true });
    }
  }
};
