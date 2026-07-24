// commands/config/modlist-config-remove.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { readModListConfig, writeModListConfig, updateModListMessage } = require('../../utils/modListMessage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlist-config-remove')
    .setDescription('Remove a role from the mod list configuration (Admin only)')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Select the staff role to remove')
        .setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to edit the mod list configuration.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const role = interaction.options.getRole('role');

    try {
      const configList = readModListConfig();

      const existingIndex = configList.findIndex(item => item.roleId === role.id);
      if (existingIndex === -1) {
        return interaction.editReply({
          embeds: [errorEmbed('Error', `Role <@&${role.id}> is not configured in the mod list.`)]
        });
      }

      configList.splice(existingIndex, 1);
      writeModListConfig(configList);
      await updateModListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Role Removed', `Role <@&${role.id}> was removed from the mod list.`)]
      });

    } catch (err) {
      console.error('[MODLIST-CONFIG-REMOVE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to remove role from mod list: ${err.message}`)]
      });
    }
  }
};
