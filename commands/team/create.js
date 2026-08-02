const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

const CREWLIST_PATH = path.join(__dirname, '../../data/crewlist.json');

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
}
function writeCrewList(data) {
  fs.writeFileSync(CREWLIST_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Team management commands')

    // --- /team addteam ---
    .addSubcommand(sub =>
      sub.setName('addteam')
        .setDescription('Create a new team (creates role and assigns it to owner)')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Enter the team name to create')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('owner')
            .setDescription('The franchise owner of this team')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('color')
            .setDescription('Primary team color (e.g. blue or #00FF7F)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('secondary_color')
            .setDescription('Secondary team color (e.g. green or #00FF00)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('icon_url')
            .setDescription('Icon URL for the team (optional)')
            .setRequired(false))
    )

    // --- /team transfer ---
    .addSubcommand(sub =>
      sub.setName('transfer')
        .setDescription('Transfer team ownership to another user')
        .addRoleOption(option =>
          option.setName('team_role')
            .setDescription('The team to transfer ownership of')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('new_owner')
            .setDescription('The new franchise owner')
            .setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // =====================
    // /team addteam
    // =====================
    if (sub === 'addteam') {
      const { isSuperAdmin } = require('../../utils/permissions');
      const hasAdminRole = interaction.member.roles.cache.has('1526008884463013908');
      const isAllowed = isSuperAdmin(interaction.member) || hasAdminRole;

      if (!isAllowed) {
        return interaction.reply({
          embeds: [errorEmbed('Permission Denied', 'You must be an Admin or higher to create teams.')],
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const teamName  = interaction.options.getString('name');
        const ownerUser = interaction.options.getUser('owner');
        const colorOpt  = interaction.options.getString('color');
        const color2Opt = interaction.options.getString('secondary_color');
        const iconUrl   = interaction.options.getString('icon_url') || '';

        const crewList = readCrewList();
        const { getMaxCrews } = require('../../utils/crewLimitHelper');
        const maxCrews = getMaxCrews();

        if (crewList.length >= maxCrews) {
          return await interaction.editReply({
            embeds: [errorEmbed('Crew Limit Reached', `The league has reached the maximum crew list cap of ${maxCrews} crews.`)]
          });
        }

        // Only block if team is currently active in crewlist.json
        const isCrewActive = crewList.some(e => e.team.toLowerCase().trim() === teamName.toLowerCase().trim());
        if (isCrewActive) {
          return await interaction.editReply({
            embeds: [errorEmbed('Team Already Exists', `A team named **${teamName}** is already an active crew in the league.`)]
          });
        }

        const colorMap = {
          pink: '#FFC0CB',
          red: '#FF0000',
          blue: '#0000FF',
          green: '#00FF00',
          yellow: '#FFFF00',
          purple: '#800080',
          orange: '#FFA500',
          black: '#000001',
          white: '#FFFFFF',
          gold: '#FFD700'
        };

        const resolveColor = (input, defaultVal) => {
          if (!input) return defaultVal;
          const clean = input.toLowerCase().trim();
          if (colorMap[clean]) return colorMap[clean];
          if (/^#?[0-9A-Fa-f]{6}$/.test(clean)) {
            return clean.startsWith('#') ? clean : `#${clean}`;
          }
          return defaultVal;
        };

        const roleColor = resolveColor(colorOpt, '#00FF7F');
        const secondaryColor = resolveColor(color2Opt, '#FFFFFF');

        const role = await interaction.guild.roles.create({
          name: teamName,
          color: roleColor,
          reason: `Created team ${teamName}`
        });

        // Give the role to the owner
        const ownerMember = await interaction.guild.members.fetch(ownerUser.id).catch(() => null);
        let assignedRolesMsg = '';
        
        if (ownerMember) {
          await ownerMember.roles.add(role.id).catch(e => {
            console.error(`[ADDTEAM] Failed to give team role: ${e.message}`);
          });
          assignedRolesMsg += `\n• Assigned team role <@&${role.id}>`;

          // Remove Free Agent role from owner
          const faRole = interaction.guild.roles.cache.find(r => 
            r.name.toLowerCase() === 'free agent' || 
            r.name.toLowerCase() === 'free agents' || 
            r.name.toLowerCase() === 'fa'
          );
          if (faRole && ownerMember.roles.cache.has(faRole.id)) {
            await ownerMember.roles.remove(faRole.id).catch(e => {
              console.error(`[ADDTEAM] Failed to remove Free Agent role: ${e.message}`);
            });
            assignedRolesMsg += `\n• Removed Free Agent role <@&${faRole.id}>`;
          }

          // Fetch all roles to ensure cache is up-to-date
          const allRoles = await interaction.guild.roles.fetch();

          // Find and assign Crew Owner role
          let crewOwnerRole = allRoles.find(r => {
            const name = r.name.toLowerCase();
            return name === 'crew owner' || name === 'crew owners';
          });
          if (!crewOwnerRole) {
            crewOwnerRole = allRoles.find(r => r.name.toLowerCase().includes('crew owner'));
          }

          if (crewOwnerRole) {
            await ownerMember.roles.add(crewOwnerRole.id).catch(e => {
              console.error(`[ADDTEAM] Failed to give Crew Owner role: ${e.message}`);
            });
            assignedRolesMsg += `\n• Assigned Crew Owner role <@&${crewOwnerRole.id}>`;
          } else {
            assignedRolesMsg += `\n• ⚠️ *Crew Owner role not found in server.*`;
          }
        } else {
          assignedRolesMsg += `\n• ⚠️ *Could not fetch owner in server to assign roles.*`;
        }

        // Save to database
        db.createTeam({ name: teamName, abbreviation: '', logo: iconUrl, roleId: role.id, color: roleColor, color2: secondaryColor });

        // Auto-add to crewlist.json
        const currentCrewList = readCrewList();
        const idx = currentCrewList.findIndex(e => e.team.toLowerCase() === teamName.toLowerCase());
        const entry = {
          team: teamName,
          roleId: role.id,
          ownerTag: `<@${ownerUser.id}>`,
          ownerId: ownerUser.id,
          iconUrl,
          color: roleColor,
          color2: secondaryColor
        };
        if (idx >= 0) {
          currentCrewList[idx] = entry;
        } else {
          currentCrewList.push(entry);
        }
        writeCrewList(currentCrewList);

        // Update live message
        const { updateCrewListMessage } = require('../../utils/crewListMessage');
        await updateCrewListMessage(interaction.guild).catch(console.error);

        // Auto update power rankings channel message
        const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
        await updatePowerRankingsMessage(interaction.guild).catch(console.error);

        const confirmEmbed = new EmbedBuilder()
          .setColor('#00FF7F')
          .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTitle('✅ Team Created')
          .setDescription(`Team **${teamName}** has been created with role <@&${role.id}>.${assignedRolesMsg}`)
          .addFields(
            { name: 'Team Role', value: `<@&${role.id}>`, inline: true },
            { name: 'Owner', value: `<@${ownerUser.id}>`, inline: true }
          )
          .setTimestamp();

        if (iconUrl) confirmEmbed.setThumbnail(iconUrl);

        await interaction.editReply({ embeds: [confirmEmbed] });

      } catch (error) {
        console.error('[ADDTEAM] Error:', error);
        await interaction.editReply({ embeds: [errorEmbed(`Failed to create team: ${error.message}`)] });
      }
    }

    // =====================
    // /team transfer
    // =====================
    if (sub === 'transfer') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const teamRole = interaction.options.getRole('team_role');
        const newOwner = interaction.options.getUser('new_owner');
        const teamName = teamRole.name;

        // Read crew list
        const crewList = readCrewList();
        const crewEntry = crewList.find(e => e.roleId === teamRole.id || e.team.toLowerCase() === teamName.toLowerCase());

        if (!crewEntry) {
          return await interaction.editReply({
            embeds: [errorEmbed(`Team **${teamName}** is not registered in the crew list.`)]
          });
        }

        const previousOwnerId = crewEntry.ownerId;

        // Auth check: User must be an admin OR the current owner of the team
        const userIsAdmin = isAdmin(interaction.member);
        const userIsCurrentOwner = previousOwnerId && interaction.user.id === previousOwnerId;

        if (!userIsAdmin && !userIsCurrentOwner) {
          return await interaction.editReply({
            embeds: [errorEmbed('Only admins or the current franchise owner can transfer ownership.')]
          });
        }

        // Fetch new owner member
        const newOwnerMember = await interaction.guild.members.fetch(newOwner.id).catch(() => null);
        if (!newOwnerMember) {
          return await interaction.editReply({
            embeds: [errorEmbed('Could not find the new owner in the server.')]
          });
        }

        // Find Crew Owner role
        const allRoles = await interaction.guild.roles.fetch();
        let crewOwnerRole = allRoles.find(r => {
          const name = r.name.toLowerCase();
          return name === 'crew owner' || name === 'crew owners';
        });
        if (!crewOwnerRole) {
          crewOwnerRole = allRoles.find(r => r.name.toLowerCase().includes('crew owner'));
        }

        if (!crewOwnerRole) {
          return await interaction.editReply({
            embeds: [errorEmbed('Could not find the Crew Owner role in the server.')]
          });
        }

        let changesMsg = '';

        // Give team role and owner role to the new owner
        await newOwnerMember.roles.add(teamRole.id).catch(console.error);
        await newOwnerMember.roles.add(crewOwnerRole.id).catch(console.error);
        changesMsg += `\n• Assigned role <@&${teamRole.id}> to <@${newOwner.id}>`;
        changesMsg += `\n• Assigned role <@&${crewOwnerRole.id}> to <@${newOwner.id}>`;

        // Manage previous owner's roles
        if (previousOwnerId) {
          const previousOwnerMember = await interaction.guild.members.fetch(previousOwnerId).catch(() => null);
          if (previousOwnerMember) {
            // Remove team role
            await previousOwnerMember.roles.remove(teamRole.id).catch(console.error);
            changesMsg += `\n• Removed role <@&${teamRole.id}> from <@${previousOwnerId}>`;

            // Check if previous owner owns any OTHER teams in the crew list
            const ownsOtherTeams = crewList.some(e => e.ownerId === previousOwnerId && e.roleId !== teamRole.id);
            if (!ownsOtherTeams) {
              await previousOwnerMember.roles.remove(crewOwnerRole.id).catch(console.error);
              changesMsg += `\n• Removed role <@&${crewOwnerRole.id}> from <@${previousOwnerId}>`;
            }
          }
        }

        // Update crew list entry
        crewEntry.ownerId = newOwner.id;
        crewEntry.ownerTag = `<@${newOwner.id}>`;
        writeCrewList(crewList);

        // Update the live crew list message
        await updateCrewListMessage(interaction.guild);

        // --- Build transactions post ---
        const transactionEmbed = new EmbedBuilder()
          .setColor('#00FF7F')
          .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTitle('Ownership Transferred')
          .addFields(
            { name: 'Team', value: `<@&${teamRole.id}>` },
            { name: 'New Owner', value: `<@${newOwner.id}>`, inline: true },
            { name: 'Previous Owner', value: previousOwnerId ? `<@${previousOwnerId}>` : 'None', inline: true },
            { name: 'Transferred By', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setTimestamp();

        const transactionsChannel = interaction.guild.channels.cache.find(
          c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
        );
        if (transactionsChannel) {
          await transactionsChannel.send({ embeds: [transactionEmbed] }).catch(console.error);
        }

        await interaction.editReply({
          embeds: [successEmbed('Ownership Transferred', `Successfully transferred **${teamName}** to <@${newOwner.id}>!${changesMsg}`)]
        });

      } catch (error) {
        console.error('[TRANSFER] Error:', error);
        await interaction.editReply({ embeds: [errorEmbed(`Failed to transfer ownership: ${error.message}`)] });
      }
    }
  }
};
