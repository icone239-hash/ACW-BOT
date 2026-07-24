// commands/config/modlist-setup.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { updateModListMessage } = require('../../utils/modListMessage');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlist-setup')
    .setDescription('Setup the 🛡・mod-list channel and post the initial message (Admin only)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to setup the mod list.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

      // Check if channel already exists
      let channel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('mod-list') || c.name.includes('modlist'))
      );

      if (!channel) {
        const { PermissionFlagsBits } = require('discord.js');
        const permissionOverwrites = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.SendMessages],
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
          }
        ];

        // Explicitly allow admin and superAdmin roles to send messages
        const staffRoleIds = [
          ...(config.adminRoles || []),
          ...(config.superAdminRoles || [])
        ];

        for (const roleId of staffRoleIds) {
          if (interaction.guild.roles.cache.has(roleId)) {
            permissionOverwrites.push({
              id: roleId,
              allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
            });
          }
        }

        // Create the channel
        channel = await interaction.guild.channels.create({
          name: '🛡・mod-list',
          type: ChannelType.GuildText,
          permissionOverwrites
        });
      }

      // Update config.json
      if (!config.channels) config.channels = {};
      config.channels.modList = channel.id;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

      // Post the initial message
      await updateModListMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Mod List Setup Complete', `Successfully configured <#${channel.id}> as the mod list channel.`)]
      });

    } catch (err) {
      console.error('[MODLIST-SETUP] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to setup mod list channel: ${err.message}`)]
      });
    }
  }
};
