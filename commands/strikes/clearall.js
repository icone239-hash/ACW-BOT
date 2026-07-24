const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isSuperAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearstrikes')
    .setDescription('Clears all strikes for a user or the entire season')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to clear (optional)')
        .setRequired(false)),
  async execute(interaction) {
    if (!isSuperAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be a super admin to use this command.')], ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');

    try {
      if (user) {
        db.clearUserStrikes(user.id);
        await interaction.reply({ embeds: [successEmbed('Strikes Cleared', `All strikes for <@${user.id}> have been cleared.`)], ephemeral: true });
      } else {
        db.clearAllStrikes();
        await interaction.reply({ embeds: [successEmbed('Strikes Cleared', 'All strikes for the season have been cleared.')], ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to clear strikes.')], ephemeral: true });
    }
  }
};
