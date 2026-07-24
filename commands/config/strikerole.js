const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-add-strike-role')
    .setDescription('Adds a role ID to strikeRoles')
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
      
      if (!config.strikeRoles) config.strikeRoles = [];
      if (!config.strikeRoles.includes(role.id)) {
        config.strikeRoles.push(role.id);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }

      await interaction.reply({ embeds: [successEmbed('Config Updated', `Added <@&${role.id}> to strikeRoles.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to update config.')], ephemeral: true });
    }
  }
};
