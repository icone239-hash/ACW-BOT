const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearstrike')
    .setDescription('Removes the most recent strike from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user')
        .setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');

    try {
      const strikes = db.getUserStrikes(user.id);
      if (!strikes || strikes.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Not Found', 'User has no strikes.')], ephemeral: true });
      }

      db.clearLastStrike(user.id);
      await interaction.reply({ embeds: [successEmbed('Strike Cleared', `Most recent strike for <@${user.id}> has been cleared.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to clear strike.')], ephemeral: true });
    }
  }
};
