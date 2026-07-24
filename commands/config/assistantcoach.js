const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-assistant-coach')
    .setDescription('Sets assistantCoachRole')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to set')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    
    try {
      const configPath = './config.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      config.assistantCoachRole = role.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      await interaction.reply({ embeds: [successEmbed('Config Updated', `Set assistantCoachRole to <@&${role.id}>.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to update config.')], ephemeral: true });
    }
  }
};
