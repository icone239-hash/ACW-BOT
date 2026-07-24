const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game-cancel')
    .setDescription('Cancels a scheduled game')
    .addStringOption(option =>
      option.setName('game-id')
        .setDescription('The ID of the game')
        .setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }
    
    const gameId = interaction.options.getString('game-id');

    const game = db.getGame(gameId);
    if (!game) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Game does not exist.')], ephemeral: true });
    }

    try {
      db.cancelGame(gameId);
      await interaction.reply({ embeds: [successEmbed('Game Cancelled', `Game ID **${gameId}** has been cancelled.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to cancel game.')], ephemeral: true });
    }
  }
};
