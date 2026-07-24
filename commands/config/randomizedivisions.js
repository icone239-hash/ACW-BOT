// commands/config/randomizedivisions.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin } = require('../../utils/permissions');
const { randomizeTeamDivisions, updatePowerRankingsMessage } = require('../../utils/powerRankings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('randomizedivisions')
    .setDescription('Randomly shuffle and assign all crews evenly into the 4 divisions (Admin only)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member) && !isSuperAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an Admin or higher to randomize team divisions.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      randomizeTeamDivisions();

      // Refresh the live Power Rankings message in Discord
      await updatePowerRankingsMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Divisions Randomized', 'Successfully shuffled and distributed all crews evenly across the 4 divisions!')]
      });

    } catch (err) {
      console.error('[RANDOMIZEDIVISIONS] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to randomize divisions: ${err.message}`)]
      });
    }
  }
};
