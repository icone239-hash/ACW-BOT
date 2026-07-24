// commands/config/modlist-update.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { updateModListMessage } = require('../../utils/modListMessage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlist-update')
    .setDescription('Force update the live mod-list message (Admin only)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to update the mod list.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await updateModListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Mod List Updated', 'Successfully forced an update to the live mod list channel.')]
      });

    } catch (err) {
      console.error('[MODLIST-UPDATE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to update mod list: ${err.message}`)]
      });
    }
  }
};
