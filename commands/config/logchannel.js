const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-set-log-channel')
    .setDescription('Sets logChannelId')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to set')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    try {
      const configPath = './config.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      config.logChannelId = channel.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      await interaction.reply({ embeds: [successEmbed('Config Updated', `Set logChannelId to <#${channel.id}>.`)], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to update config.')], ephemeral: true });
    }
  }
};
