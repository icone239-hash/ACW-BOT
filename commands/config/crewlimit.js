// commands/config/crewlimit.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin } = require('../../utils/permissions');
const { updateCrewListMessage } = require('../../utils/crewListMessage');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crewlimit')
    .setDescription('Change the maximum crew list limit for the league (Admin only)')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('The new crew list limit (e.g. 34)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member) && !isSuperAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an Admin or higher to change the crew limit.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const newLimit = interaction.options.getInteger('limit');

    try {
      const { setMaxCrews } = require('../../utils/crewLimitHelper');
      setMaxCrews(newLimit);

      // Refresh the live crew list message in Discord
      await updateCrewListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Crew Limit Updated', `The crew list limit has been permanently set to **${newLimit}** crews.`)]
      });

    } catch (err) {
      console.error('[CREWLIMIT] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to update crew limit: ${err.message}`)]
      });
    }
  }
};
