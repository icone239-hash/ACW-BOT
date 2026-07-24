// commands/config/config.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const { isSuperAdmin } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Bot and league configuration commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // 1. add-admin-role
    .addSubcommand(sub =>
      sub.setName('add-admin-role')
        .setDescription('Add a Community Admin role (grants bot admin access)')
        .addRoleOption(opt => opt.setName('role').setDescription('Select admin role').setRequired(true)))

    // 2. remove-admin-role
    .addSubcommand(sub =>
      sub.setName('remove-admin-role')
        .setDescription('Remove a Community Admin role')
        .addRoleOption(opt => opt.setName('role').setDescription('Select admin role').setRequired(true)))

    // 3. add-super-admin-role
    .addSubcommand(sub =>
      sub.setName('add-super-admin-role')
        .setDescription('Add a Super Admin role (can change cooldowns, mod configs, and all sensitive settings)')
        .addRoleOption(opt => opt.setName('role').setDescription('Select super admin role').setRequired(true)))

    // 4. remove-super-admin-role
    .addSubcommand(sub =>
      sub.setName('remove-super-admin-role')
        .setDescription('Remove a Super Admin role')
        .addRoleOption(opt => opt.setName('role').setDescription('Select super admin role').setRequired(true)))

    // 5. add-mod-strike-role
    .addSubcommand(sub =>
      sub.setName('add-mod-strike-role')
        .setDescription('Add a role to be removed when a mod receives 3 strikes')
        .addRoleOption(opt => opt.setName('role').setDescription('Select mod strike role').setRequired(true)))

    // 6. remove-mod-strike-role
    .addSubcommand(sub =>
      sub.setName('remove-mod-strike-role')
        .setDescription('Remove a role from the mod strike removal list')
        .addRoleOption(opt => opt.setName('role').setDescription('Select mod strike role').setRequired(true)))

    // 7. franchise-owner
    .addSubcommand(sub =>
      sub.setName('franchise-owner')
        .setDescription('Set the Franchise Owner (FO) role')
        .addRoleOption(opt => opt.setName('role').setDescription('Select FO role').setRequired(true)))

    // 8. general-manager
    .addSubcommand(sub =>
      sub.setName('general-manager')
        .setDescription('Set the General Manager (GM) role')
        .addRoleOption(opt => opt.setName('role').setDescription('Select GM role').setRequired(true)))

    // 9. head-coach
    .addSubcommand(sub =>
      sub.setName('head-coach')
        .setDescription('Set the Head Coach (HC) role')
        .addRoleOption(opt => opt.setName('role').setDescription('Select HC role').setRequired(true)))

    // 10. assistant-coach
    .addSubcommand(sub =>
      sub.setName('assistant-coach')
        .setDescription('Set the Assistant Coach (AC) role')
        .addRoleOption(opt => opt.setName('role').setDescription('Select AC role').setRequired(true)))

    // 11. remove-franchise-role
    .addSubcommand(sub =>
      sub.setName('remove-franchise-role')
        .setDescription('Unset a built-in franchise role (FO, GM, HC, or AC)')
        .addStringOption(opt =>
          opt.setName('slot')
            .setDescription('Select slot to unset')
            .setRequired(true)
            .addChoices(
              { name: 'Franchise Owner (FO)', value: 'fo' },
              { name: 'General Manager (GM)', value: 'gm' },
              { name: 'Head Coach (HC)', value: 'hc' },
              { name: 'Assistant Coach (AC)', value: 'ac' }
            )))

    // 12. custom-franchise-role
    .addSubcommand(sub =>
      sub.setName('custom-franchise-role')
        .setDescription('Add a custom franchise role and place it in the hierarchy')
        .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Custom role title (e.g. Co-FO)').setRequired(true)))

    // 13. remove-custom-franchise-role
    .addSubcommand(sub =>
      sub.setName('remove-custom-franchise-role')
        .setDescription('Remove a custom franchise role from the hierarchy')
        .addStringOption(opt => opt.setName('name').setDescription('Custom role title to remove').setRequired(true)))

    // 14. set-captain-role
    .addSubcommand(sub =>
      sub.setName('set-captain-role')
        .setDescription('Set the Captain franchise role for captain-limit enforcement')
        .addRoleOption(opt => opt.setName('role').setDescription('Select Captain role').setRequired(true)))

    // 15. set-captain-limit
    .addSubcommand(sub =>
      sub.setName('set-captain-limit')
        .setDescription('Set the maximum number of Captains allowed per crew')
        .addIntegerOption(opt => opt.setName('limit').setDescription('Max captains (e.g. 3)').setRequired(true)))

    // 16. set-channel
    .addSubcommand(sub =>
      sub.setName('set-channel')
        .setDescription('Set a key channel for the bot')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('Select channel purpose')
            .setRequired(true)
            .addChoices(
              { name: 'Logs Channel', value: 'log' },
              { name: 'Scores Channel', value: 'scores' },
              { name: 'Transactions Channel', value: 'transactions' },
              { name: 'Suspensions Channel', value: 'suspensions' },
              { name: 'Crew List Channel', value: 'crewlist' },
              { name: 'Power Rankings Channel', value: 'powerRankings' },
              { name: 'Mod Strikes Channel', value: 'modStrikes' }
            ))
        .addChannelOption(opt => opt.setName('channel').setDescription('Select channel').setRequired(true)))

    // Subcommand Group: promote-permissions
    .addSubcommandGroup(group =>
      group.setName('promote-permissions')
        .setDescription('Manage roles allowed to use /promote')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Allow a role to use /promote (e.g. Co-FO, GM, HC)')
            .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a role from /promote access')
            .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('Show roles allowed to use /promote')))

    // Subcommand Group: demote-permissions
    .addSubcommandGroup(group =>
      group.setName('demote-permissions')
        .setDescription('Manage roles allowed to use /demote')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Allow a role to use /demote (e.g. Co-FO, GM, HC)')
            .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a role from /demote access')
            .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('Show roles allowed to use /demote')))

    // Subcommand Group: record-permissions
    .addSubcommandGroup(group =>
      group.setName('record-permissions')
        .setDescription('Manage record permissions and audit logging')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Allow a role to use /league setrecord and /league auditteam repair')
            .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a role from record-edit access')
            .addRoleOption(opt => opt.setName('role').setDescription('Select role').setRequired(true)))
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('Show roles that can edit team records'))
        .addSubcommand(sub =>
          sub.setName('set-log-channel')
            .setDescription('Set the channel where all record adjustments are logged')
            .addChannelOption(opt => opt.setName('channel').setDescription('Select channel').setRequired(true)))),

  async execute(interaction) {
    if (!isSuperAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Only Super Admins can manage bot configuration settings.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub   = interaction.options.getSubcommand();
    const config = readConfig();

    // Ensure structures exist
    if (!config.adminRoles) config.adminRoles = [];
    if (!config.superAdminRoles) config.superAdminRoles = [];
    if (!config.modStrikeRoles) config.modStrikeRoles = [];
    if (!config.promoteRoles) config.promoteRoles = [];
    if (!config.demoteRoles) config.demoteRoles = [];
    if (!config.franchiseRoles) {
      config.franchiseRoles = { fo: null, gm: null, hc: null, ac: null, captain: null, captainLimit: 3, custom: [] };
    }
    if (!config.recordPermissions) {
      config.recordPermissions = { roles: [], logChannelId: null };
    }
    if (!config.channels) {
      config.channels = {};
    }

    // ==========================================
    // SUBCOMMAND GROUP: promote-permissions
    // ==========================================
    if (group === 'promote-permissions') {
      if (sub === 'add') {
        const role = interaction.options.getRole('role');
        if (!config.promoteRoles.includes(role.id)) {
          config.promoteRoles.push(role.id);
          writeConfig(config);
        }
        return interaction.reply({
          embeds: [successEmbed('Promote Permission Added', `Granted /promote permission to <@&${role.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'remove') {
        const role = interaction.options.getRole('role');
        config.promoteRoles = config.promoteRoles.filter(id => id !== role.id);
        writeConfig(config);
        return interaction.reply({
          embeds: [successEmbed('Promote Permission Removed', `Revoked /promote permission from <@&${role.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'list') {
        const rolesDisplay = config.promoteRoles.length > 0
          ? config.promoteRoles.map(id => `<@&${id}>`).join(', ')
          : 'None configured (Franchise Owners & Admins only)';

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('⭐ Promote Permissions')
          .addFields({ name: 'Roles Allowed to use /promote', value: rolesDisplay, inline: false })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    }

    // ==========================================
    // SUBCOMMAND GROUP: demote-permissions
    // ==========================================
    if (group === 'demote-permissions') {
      if (sub === 'add') {
        const role = interaction.options.getRole('role');
        if (!config.demoteRoles.includes(role.id)) {
          config.demoteRoles.push(role.id);
          writeConfig(config);
        }
        return interaction.reply({
          embeds: [successEmbed('Demote Permission Added', `Granted /demote permission to <@&${role.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'remove') {
        const role = interaction.options.getRole('role');
        config.demoteRoles = config.demoteRoles.filter(id => id !== role.id);
        writeConfig(config);
        return interaction.reply({
          embeds: [successEmbed('Demote Permission Removed', `Revoked /demote permission from <@&${role.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'list') {
        const rolesDisplay = config.demoteRoles.length > 0
          ? config.demoteRoles.map(id => `<@&${id}>`).join(', ')
          : 'None configured (Franchise Owners & Admins only)';

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🔻 Demote Permissions')
          .addFields({ name: 'Roles Allowed to use /demote', value: rolesDisplay, inline: false })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    }

    // ==========================================
    // SUBCOMMAND GROUP: record-permissions
    // ==========================================
    if (group === 'record-permissions') {
      if (sub === 'add') {
        const role = interaction.options.getRole('role');
        if (!config.recordPermissions.roles.includes(role.id)) {
          config.recordPermissions.roles.push(role.id);
          writeConfig(config);
        }
        return interaction.reply({
          embeds: [successEmbed('Record Permission Added', `Granted record edit access to <@&${role.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'remove') {
        const role = interaction.options.getRole('role');
        config.recordPermissions.roles = config.recordPermissions.roles.filter(id => id !== role.id);
        writeConfig(config);
        return interaction.reply({
          embeds: [successEmbed('Record Permission Removed', `Revoked record edit access from <@&${role.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'list') {
        const rolesDisplay = config.recordPermissions.roles.length > 0
          ? config.recordPermissions.roles.map(id => `<@&${id}>`).join(', ')
          : 'None configured (Admins only)';
        
        const channelDisplay = config.recordPermissions.logChannelId
          ? `<#${config.recordPermissions.logChannelId}>`
          : 'None set';

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📜 Record Permissions & Logging')
          .addFields(
            { name: 'Roles Allowed to Edit Records', value: rolesDisplay, inline: false },
            { name: 'Record Adjustment Log Channel', value: channelDisplay, inline: false }
          )
          .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      if (sub === 'set-log-channel') {
        const channel = interaction.options.getChannel('channel');
        config.recordPermissions.logChannelId = channel.id;
        writeConfig(config);
        return interaction.reply({
          embeds: [successEmbed('Log Channel Set', `Record adjustments will be logged in <#${channel.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // ==========================================
    // TOP LEVEL SUBCOMMANDS
    // ==========================================
    if (sub === 'add-admin-role') {
      const role = interaction.options.getRole('role');
      if (!config.adminRoles.includes(role.id)) {
        config.adminRoles.push(role.id);
        writeConfig(config);
      }
      return interaction.reply({
        embeds: [successEmbed('Admin Role Added', `Added <@&${role.id}> as a Community Admin role.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'remove-admin-role') {
      const role = interaction.options.getRole('role');
      config.adminRoles = config.adminRoles.filter(id => id !== role.id);
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Admin Role Removed', `Removed <@&${role.id}> from Community Admin roles.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'add-super-admin-role') {
      const role = interaction.options.getRole('role');
      if (!config.superAdminRoles.includes(role.id)) {
        config.superAdminRoles.push(role.id);
        writeConfig(config);
      }
      return interaction.reply({
        embeds: [successEmbed('Super Admin Role Added', `Added <@&${role.id}> as a Super Admin role.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'remove-super-admin-role') {
      const role = interaction.options.getRole('role');
      config.superAdminRoles = config.superAdminRoles.filter(id => id !== role.id);
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Super Admin Role Removed', `Removed <@&${role.id}> from Super Admin roles.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'add-mod-strike-role') {
      const role = interaction.options.getRole('role');
      if (!config.modStrikeRoles.includes(role.id)) {
        config.modStrikeRoles.push(role.id);
        writeConfig(config);
      }
      return interaction.reply({
        embeds: [successEmbed('Mod Strike Role Added', `Added <@&${role.id}> to mod strike removal list.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'remove-mod-strike-role') {
      const role = interaction.options.getRole('role');
      config.modStrikeRoles = config.modStrikeRoles.filter(id => id !== role.id);
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Mod Strike Role Removed', `Removed <@&${role.id}> from mod strike removal list.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'franchise-owner') {
      const role = interaction.options.getRole('role');
      config.franchiseRoles.fo = role.id;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Role Configured', `Set Franchise Owner (FO) role to <@&${role.id}>.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'general-manager') {
      const role = interaction.options.getRole('role');
      config.franchiseRoles.gm = role.id;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Role Configured', `Set General Manager (GM) role to <@&${role.id}>.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'head-coach') {
      const role = interaction.options.getRole('role');
      config.franchiseRoles.hc = role.id;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Role Configured', `Set Head Coach (HC) role to <@&${role.id}>.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'assistant-coach') {
      const role = interaction.options.getRole('role');
      config.franchiseRoles.ac = role.id;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Role Configured', `Set Assistant Coach (AC) role to <@&${role.id}>.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'remove-franchise-role') {
      const slot = interaction.options.getString('slot');
      config.franchiseRoles[slot] = null;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Role Unset', `Unset the ${slot.toUpperCase()} franchise role.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'custom-franchise-role') {
      const role = interaction.options.getRole('role');
      const name = interaction.options.getString('name');

      if (!config.franchiseRoles.custom) config.franchiseRoles.custom = [];
      config.franchiseRoles.custom = config.franchiseRoles.custom.filter(c => c.name.toLowerCase() !== name.toLowerCase());
      config.franchiseRoles.custom.push({ roleId: role.id, name });
      writeConfig(config);

      return interaction.reply({
        embeds: [successEmbed('Custom Role Added', `Added custom franchise role **${name}** (<@&${role.id}>).`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'remove-custom-franchise-role') {
      const name = interaction.options.getString('name');
      if (config.franchiseRoles.custom) {
        config.franchiseRoles.custom = config.franchiseRoles.custom.filter(c => c.name.toLowerCase() !== name.toLowerCase());
        writeConfig(config);
      }
      return interaction.reply({
        embeds: [successEmbed('Custom Role Removed', `Removed custom franchise role **${name}**.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'set-captain-role') {
      const role = interaction.options.getRole('role');
      config.franchiseRoles.captain = role.id;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Role Configured', `Set Captain role to <@&${role.id}>.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'set-captain-limit') {
      const limit = interaction.options.getInteger('limit');
      config.franchiseRoles.captainLimit = limit;
      writeConfig(config);
      return interaction.reply({
        embeds: [successEmbed('Limit Updated', `Set Captain limit per crew to **${limit}**.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'set-channel') {
      const key = interaction.options.getString('key');
      const channel = interaction.options.getChannel('channel');

      config.channels[key] = channel.id;
      if (key === 'log') config.logChannelId = channel.id;
      if (key === 'scores') config.scoresChannelId = channel.id;

      writeConfig(config);

      return interaction.reply({
        embeds: [successEmbed('Channel Set', `Set **${key}** channel to <#${channel.id}>.`)],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
