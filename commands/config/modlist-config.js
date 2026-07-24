// commands/config/modlist-config.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { readModListConfig, writeModListConfig, updateModListMessage } = require('../../utils/modListMessage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlist-config')
    .setDescription('Add or update a role in the mod list configuration (Admin only)')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Select the staff role')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Set the maximum limit for this role')
        .setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to configure the mod list.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const role = interaction.options.getRole('role');
    const limit = interaction.options.getInteger('limit');

    try {
      const configList = readModListConfig();

      const existingIndex = configList.findIndex(item => item.roleId === role.id);
      if (existingIndex !== -1) {
        configList[existingIndex].limit = limit;
        configList[existingIndex].name = role.name;
      } else {
        configList.push({
          roleId: role.id,
          name: role.name,
          limit: limit
        });
      }

      writeModListConfig(configList);
      await updateModListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Mod List Configured', `Role <@&${role.id}> has been configured in the mod list with a limit of **${limit}**.`)]
      });

    } catch (err) {
      console.error('[MODLIST-CONFIG] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to configure role: ${err.message}`)]
      });
    }
  }
};
