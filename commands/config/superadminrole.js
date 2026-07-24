const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-add-super-admin-role')
    .setDescription('Adds a role ID to superAdminRoles')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to add')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    
    try {
      const configPath = './config.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!config.superAdminRoles) config.superAdminRoles = [];
      if (!config.superAdminRoles.includes(role.id)) {
        config.superAdminRoles.push(role.id);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }

      await interaction.reply({ embeds: [successEmbed('Config Updated', `Added <@&${role.id}> to superAdminRoles.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to update config.')], ephemeral: true });
    }
  }
};
