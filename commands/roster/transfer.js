const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster-transfer')
    .setDescription('Transfers a player to a new team')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to transfer')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('to-team')
        .setDescription('The new team')
        .setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }
    
    const playerUser = interaction.options.getUser('player');
    const toTeamName = interaction.options.getString('to-team');

    const newTeam = db.getTeam(toTeamName);
    if (!newTeam) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'New team does not exist.')], ephemeral: true });
    }
    
    const player = db.getPlayer(playerUser.id);
    if (!player) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Player not found.')], ephemeral: true });
    }

    try {
      db.transferPlayer(playerUser.id, newTeam.id);
      await interaction.reply({ embeds: [successEmbed('Player Transferred', `<@${playerUser.id}> has been transferred to **${newTeam.name}**.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to transfer player.')], ephemeral: true });
    }
  }
};
