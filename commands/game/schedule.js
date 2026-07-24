const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game-schedule')
    .setDescription('Schedules a game')
    .addStringOption(option =>
      option.setName('team1')
        .setDescription('First team')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('team2')
        .setDescription('Second team')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Date of the game')
        .setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }
    
    const team1Name = interaction.options.getString('team1');
    const team2Name = interaction.options.getString('team2');
    const date = interaction.options.getString('date');

    const team1 = db.getTeam(team1Name);
    const team2 = db.getTeam(team2Name);

    if (!team1 || !team2) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'One or both teams do not exist.')], ephemeral: true });
    }

    try {
      db.scheduleGame({ team1Id: team1.id, team2Id: team2.id, scheduledAt: date });
      await interaction.reply({ embeds: [successEmbed('Game Scheduled', `Scheduled: **${team1.name}** vs **${team2.name}** on **${date}**.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to schedule game.')], ephemeral: true });
    }
  }
};
