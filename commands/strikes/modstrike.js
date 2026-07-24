// commands/strikes/modstrike.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isSuperAdmin } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');

const MOD_STRIKES_PATH = path.join(__dirname, '../../data/mod_strikes.json');
const MOD_CONFIG_PATH = path.join(__dirname, '../../data/mod_strike_config.json');

function readModStrikes() {
  try {
    if (!fs.existsSync(MOD_STRIKES_PATH)) {
      fs.writeFileSync(MOD_STRIKES_PATH, JSON.stringify([]), 'utf8');
    }
    return JSON.parse(fs.readFileSync(MOD_STRIKES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeModStrikes(data) {
  fs.writeFileSync(MOD_STRIKES_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readModConfig() {
  try {
    if (!fs.existsSync(MOD_CONFIG_PATH)) {
      fs.writeFileSync(MOD_CONFIG_PATH, JSON.stringify({ allowedRoles: [] }), 'utf8');
    }
    return JSON.parse(fs.readFileSync(MOD_CONFIG_PATH, 'utf8'));
  } catch {
    return { allowedRoles: [] };
  }
}

function writeModConfig(data) {
  fs.writeFileSync(MOD_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function canIssueModStrike(member) {
  if (isSuperAdmin(member)) return true;
  const config = readModConfig();
  if (config.allowedRoles && config.allowedRoles.length > 0) {
    return member.roles.cache.some(r => config.allowedRoles.includes(r.id));
  }
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Mod strike management commands')
    .addSubcommand(sub =>
      sub.setName('modstrike')
        .setDescription('Give a mod a strike (3 strikes = mod role removed)')
        .addUserOption(option =>
          option.setName('member')
            .setDescription('Select the staff/mod member')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for issuing mod strike')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('modstrikeconfig')
        .setDescription('Add or remove a role allowed to use /mod modstrike (Super Admin only)')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Add or remove role permission')
            .setRequired(true)
            .addChoices(
              { name: 'Add Role', value: 'add' },
              { name: 'Remove Role', value: 'remove' }
            ))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Select the role')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('viewmodstrikeconfig')
        .setDescription('View allowed roles and current mod strike standings')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // --- Subcommand: modstrike ---
    if (sub === 'modstrike') {
      if (!canIssueModStrike(interaction.member)) {
        return interaction.reply({
          embeds: [errorEmbed('You do not have permission to issue mod strikes.')],
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const targetUser = interaction.options.getUser('member');
        const reason     = interaction.options.getString('reason');

        const strikes = readModStrikes();
        const userStrikes = strikes.filter(s => s.userId === targetUser.id);
        const totalStrikes = userStrikes.length + 1;

        const newRecord = {
          id: strikes.length > 0 ? Math.max(...strikes.map(s => s.id)) + 1 : 1,
          userId: targetUser.id,
          username: targetUser.username,
          reason,
          issuedById: interaction.user.id,
          createdAt: new Date().toISOString()
        };

        strikes.push(newRecord);
        writeModStrikes(strikes);

        // Fetch target member
        const guild = interaction.client.guilds.cache.get('1525985063143997691') || interaction.guild;
        const targetMember = guild ? await guild.members.fetch(targetUser.id).catch(() => null) : null;
        let removedRoleName = 'None';
        let roleRemovedNotice = null;

        // Check 3 strikes rule
        if (totalStrikes >= 3 && targetMember) {
          const botHighestRole = interaction.guild.members.me.roles.highest;
          const removableRole = targetMember.roles.cache
            .filter(r => r.id !== interaction.guild.id && !r.managed && r.position < botHighestRole.position)
            .sort((a, b) => b.position - a.position)
            .first();

          if (removableRole) {
            removedRoleName = removableRole.name;
            await targetMember.roles.remove(removableRole.id).catch(err => {
              console.error(`[MOD STRIKE] Failed to remove role: ${err.message}`);
            });
            roleRemovedNotice = `🚨 **3 Strikes Reached!** Automatically removed highest role **@${removedRoleName}** from <@${targetUser.id}>.`;
          }
        }

        // Build embed
        const embed = new EmbedBuilder()
          .setColor(totalStrikes >= 3 ? '#ED4245' : '#E67E22')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          })
          .setTitle('⚠️ Mod Strike Issued')
          .addFields(
            { name: 'Moderator', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Total Strikes', value: `${totalStrikes}/3`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Highest Role Removed', value: totalStrikes >= 3 ? `@${removedRoleName}` : 'No (Under 3 strikes)', inline: false },
            { name: 'Issued By', value: `<@${interaction.user.id}>`, inline: false }
          )
          .setTimestamp();

        // Find mod strike channel
        const modChannel = interaction.guild.channels.cache.find(
          c => c.isTextBased() && (c.name.includes('mod-strike') || c.name.includes('mod-log') || c.name.includes('staff-strike') || c.name.includes('strikes'))
        );

        if (modChannel) {
          await modChannel.send({
            content: roleRemovedNotice ? `${roleRemovedNotice}\n<@${targetUser.id}>` : `<@${targetUser.id}>`,
            embeds: [embed]
          });
          await interaction.editReply({
            embeds: [successEmbed('Mod Strike Issued', `Successfully issued mod strike to <@${targetUser.id}>. Notice posted in <#${modChannel.id}>.`)]
          });
        } else {
          await interaction.editReply({
            embeds: [embed]
          });
        }

      } catch (err) {
        console.error('[MOD STRIKE] Error:', err);
        await interaction.editReply({
          embeds: [errorEmbed(`Failed to issue mod strike: ${err.message}`)]
        });
      }
      return;
    }

    // --- Subcommand: modstrikeconfig ---
    if (sub === 'modstrikeconfig') {
      if (!isSuperAdmin(interaction.member)) {
        return interaction.reply({
          embeds: [errorEmbed('Only Super Admins can configure mod strike permissions.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const action = interaction.options.getString('action');
      const role   = interaction.options.getRole('role');

      const config = readModConfig();
      if (!config.allowedRoles) config.allowedRoles = [];

      if (action === 'add') {
        if (!config.allowedRoles.includes(role.id)) {
          config.allowedRoles.push(role.id);
          writeModConfig(config);
        }
        return interaction.reply({
          embeds: [successEmbed('Config Updated', `Added <@&${role.id}> to allowed mod strike issuers.`)],
          flags: MessageFlags.Ephemeral
        });
      } else {
        config.allowedRoles = config.allowedRoles.filter(id => id !== role.id);
        writeModConfig(config);
        return interaction.reply({
          embeds: [successEmbed('Config Updated', `Removed <@&${role.id}> from allowed mod strike issuers.`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // --- Subcommand: viewmodstrikeconfig ---
    if (sub === 'viewmodstrikeconfig') {
      const config = readModConfig();
      const strikes = readModStrikes();

      // Count strikes per user
      const counts = {};
      strikes.forEach(s => {
        counts[s.userId] = (counts[s.userId] || 0) + 1;
      });

      const allowedRolesDisplay = config.allowedRoles && config.allowedRoles.length > 0
        ? config.allowedRoles.map(id => `<@&${id}>`).join(', ')
        : 'None configured (Super Admins only)';

      let standingsDisplay = 'No active mod strikes.';
      const userEntries = Object.entries(counts);
      if (userEntries.length > 0) {
        standingsDisplay = userEntries
          .map(([uid, cnt]) => `<@${uid}>: **${cnt}/3** strikes`)
          .join('\n');
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
          name: 'ACW S1 | Mod Strike Config & Standings', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .addFields(
          { name: 'Authorized Roles for /mod modstrike', value: allowedRolesDisplay, inline: false },
          { name: 'Current Mod Strike Standings', value: standingsDisplay, inline: false }
        )
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
