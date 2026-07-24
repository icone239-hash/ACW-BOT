const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-player')
    .setDescription('Shows a player\'s stats')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player')
        .setRequired(true)),
  async execute(interaction) {
    const playerUser = interaction.options.getUser('player');

    const player = db.getPlayer(playerUser.id);
    if (!player) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Player not found in the database.')], ephemeral: true });
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Player Stats: ${playerUser.username}`)
        .addFields(
          { name: 'Position', value: player.position || 'N/A', inline: true },
          { name: 'TDs', value: `${player.touchdowns}`, inline: true },
          { name: 'Catches', value: `${player.catches}`, inline: true },
          { name: 'Yards', value: `${player.yards}`, inline: true },
          { name: 'INTs', value: `${player.interceptions}`, inline: true },
          { name: 'Sacks', value: `${player.sacks}`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch stats.')], ephemeral: true });
    }
  }
};
