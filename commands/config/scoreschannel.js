const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config-set-scores-channel')
    .setDescription('Sets and locks the scores channel (read-only for @everyone, only higher-ups can type)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The scores channel')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    try {
      const configPath = './config.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      config.scoresChannelId = channel.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Apply channel permissions: read-only for @everyone, allow higher-ups & bot
      const adminRoleIds = [
        ...(config.adminRoles || []),
        ...(config.superAdminRoles || []),
        ...(config.modListStaffRoles || [])
      ];

      const staffRoles = interaction.guild.roles.cache.filter(r => {
        const name = r.name.toLowerCase();
        return adminRoleIds.includes(r.id) ||
               name.includes('admin') ||
               name.includes('higher up') ||
               name.includes('higher-up') ||
               name.includes('head') ||
               name.includes('manager') ||
               name.includes('staff') ||
               name.includes('bot developer') ||
               name.includes('commissioner') ||
               name.includes('league runner') ||
               name.includes('moderator') ||
               name.includes('mod');
      });

      const permissionOverwrites = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.SendMessages],
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: interaction.client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages]
        }
      ];

      staffRoles.forEach(role => {
        permissionOverwrites.push({
          id: role.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory]
        });
      });

      await channel.permissionOverwrites.set(permissionOverwrites).catch(console.error);

      await interaction.reply({
        embeds: [successEmbed('Scores Channel Set & Locked', `Set scores channel to <#${channel.id}>. Locked channel so only higher-ups/admins & bot can type!`)],
        ephemeral: true
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to update scores channel config.')], ephemeral: true });
    }
  }
};
