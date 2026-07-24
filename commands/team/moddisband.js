// commands/team/moddisband.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { updateCrewListMessage } = require('../../utils/crewListMessage');
const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
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
    .setName('moddisband')
    .setDescription('Admin command to forcibly disband a crew')
    .addRoleOption(option =>
      option.setName('team')
        .setDescription('Select the team role to disband')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for disbanding the crew (optional)')
        .setRequired(false)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const selectedRole = interaction.options.getRole('team');
    const reason = interaction.options.getString('reason') || 'Admin Disband';
    const crewList = readCrewList();

    // Look up team by role ID or role name in crewlist/DB
    const crewEntry = crewList.find(e => e.roleId === selectedRole.id || e.team.toLowerCase() === selectedRole.name.toLowerCase());
    const dbTeam = db.getTeam(selectedRole.name) || (selectedRole.id ? db.getTeams().find(t => t.roleId === selectedRole.id) : null);

    const teamName = crewEntry ? crewEntry.team : (dbTeam ? dbTeam.name : selectedRole.name);

    try {
      // 1. Determine team role
      const teamRole = selectedRole;

      // 2. Remove players from DB
      let playersReleasedCount = 0;
      if (dbTeam) {
        const teamPlayers = db.getTeamPlayers(dbTeam.id);
        playersReleasedCount = teamPlayers.length;
        for (const player of teamPlayers) {
          db.removePlayerFromTeam(player.discordId);
        }
        db.deleteTeam(dbTeam.name);
      } else {
        db.deleteTeam(teamName);
      }

      // 3. Process Discord Members and Roles
      let faRole = interaction.guild.roles.cache.find(r => 
        r.name.toLowerCase() === 'free agent' || 
        r.name.toLowerCase() === 'free agents' || 
        r.name.toLowerCase() === 'fa'
      );

      if (teamRole) {
        const members = await teamRole.members;
        for (const member of members.values()) {
          await member.roles.remove(teamRole.id).catch(console.error);
          if (faRole) {
            await member.roles.add(faRole.id).catch(console.error);
          }
        }

        // Delete team role from Discord
        await teamRole.delete(`Crew disbanded by admin ${interaction.user.tag}: ${reason}`).catch(console.error);
      }

      // 4. Remove Owner Role if owner owns no other crews
      const ownerId = crewEntry?.ownerId;
      if (ownerId) {
        const ownsOtherTeams = crewList.some(e => e.ownerId === ownerId && e.team.toLowerCase() !== teamName.toLowerCase());
        if (!ownsOtherTeams) {
          const ownerMember = await interaction.guild.members.fetch(ownerId).catch(() => null);
          if (ownerMember) {
            const allRoles = await interaction.guild.roles.fetch();
            const ownerRole = allRoles.find(r => {
              const name = r.name.toLowerCase();
              return name === 'crew owner' || name === 'crew owners' || name === 'franchise owner';
            });
            if (ownerRole && ownerMember.roles.cache.has(ownerRole.id)) {
              await ownerMember.roles.remove(ownerRole.id).catch(console.error);
            }
            if (faRole) {
              await ownerMember.roles.add(faRole.id).catch(console.error);
            }
          }
        }
      }

      // 5. Remove from crew list JSON
      const updatedCrewList = crewList.filter(e => e.team.toLowerCase() !== teamName.toLowerCase() && e.roleId !== selectedRole.id);
      writeCrewList(updatedCrewList);

      // 6. Update live messages
      await updateCrewListMessage(interaction.guild).catch(console.error);
      await updatePowerRankingsMessage(interaction.guild).catch(console.error);

      // 7. Post transaction embed in #transactions channel
      const config = require('../../config.json');
      const transactionsChannel = interaction.guild.channels.cache.get(config.channels?.transactions) ||
                                   interaction.guild.channels.cache.get('1525998986215821382') ||
                                   interaction.guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')));

      if (transactionsChannel) {
        const publicEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          })
          .setTitle('Crew Disbanded')
          .setDescription(`**${teamName}** has been officially disbanded by an Admin.`)
          .addFields(
            { name: 'Disbanded By', value: `<@${interaction.user.id}> (@${interaction.user.username})`, inline: false },
            { name: 'Reason', value: reason, inline: false }
          )
          .setImage(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();

        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Crew Disbanded', `Successfully disbanded **${teamName}** and released all players to Free Agency.`)]
      });

    } catch (err) {
      console.error('[MODDISBAND] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Disband Error', `Failed to disband crew: ${err.message}`)]
      });
    }
  }
};
