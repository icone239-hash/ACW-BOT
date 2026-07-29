// commands/roster/release.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin, getUserTeam } = require('../../utils/permissions');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

const CREWLIST_PATH = path.join(__dirname, '../../data/crewlist.json');

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release a player from your team (Franchise Owner only)')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to release from the roster')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const playerUser = interaction.options.getUser('player');
      const member = interaction.member;
      const crewList = readCrewList();

      // --- 1. Find executor's team ---
      const userTeam = getUserTeam(member);

      if (!userTeam) {
        return await interaction.editReply({
          embeds: [errorEmbed('No Team Found', 'Could not detect your team. Make sure you have your team role assigned or are registered as Crew Owner.')]
        });
      }

      // --- 2. Authorization Check ---
      const hasOwnerRole = member && member.roles && member.roles.cache && member.roles.cache.some(r =>
        r.name.toLowerCase().includes('franchise') || 
        r.name.toLowerCase().includes('owner') || 
        r.name.toLowerCase().includes('co-fo') ||
        r.name.toLowerCase() === 'fo'
      );
      const isCrewOwner = crewList.some(e => e.ownerId === member.id && e.team.toLowerCase() === userTeam.name.toLowerCase());
      const isStaffAdmin = isAdmin(member) || isSuperAdmin(member);

      if (!hasOwnerRole && !isCrewOwner && !isStaffAdmin) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'You must be the Franchise Owner or registered Crew Owner to release players.')]
        });
      }

      // Prevent releasing yourself
      if (playerUser.id === interaction.user.id && !isStaffAdmin) {
        return await interaction.editReply({
          embeds: [errorEmbed('Action Denied', 'You cannot release yourself! If you wish to disband your crew, use `/team disband`.')]
        });
      }

      // --- 3. Check if target player is on team ---
      const targetMember = await interaction.guild.members.fetch(playerUser.id).catch(() => null);
      
      let teamRole = userTeam.roleId ? interaction.guild.roles.cache.get(userTeam.roleId) : null;
      if (!teamRole) {
        teamRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === userTeam.name.toLowerCase());
      }

      const dbPlayer = db.getPlayer(playerUser.id);
      const isDbMember = dbPlayer && String(dbPlayer.teamId) === String(userTeam.id);
      const hasTeamRole = targetMember && teamRole && targetMember.roles.cache.has(teamRole.id);

      if (!hasTeamRole && !isDbMember) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not On Team', `<@${playerUser.id}> is not currently on **${userTeam.name}**.`)]
        });
      }

      // --- 4. Remove Roles & Update Database ---
      if (targetMember) {
        await interaction.guild.roles.fetch().catch(() => {});
        const allTeams = db.getTeams();
        const allTeamNames = new Set([
          ...allTeams.map(t => t.name ? t.name.toLowerCase() : ''),
          ...crewList.map(c => c.team ? c.team.toLowerCase() : ''),
          userTeam.name.toLowerCase()
        ].filter(Boolean));

        const allTeamRoleIds = new Set([
          ...allTeams.map(t => t.roleId).filter(Boolean),
          ...crewList.map(c => c.roleId).filter(Boolean),
          userTeam.roleId
        ].filter(Boolean));

        // Strip ALL team roles from member
        const rolesToRemove = targetMember.roles.cache.filter(role => {
          const nameLower = role.name.toLowerCase();
          return allTeamRoleIds.has(role.id) || allTeamNames.has(nameLower);
        });

        for (const [rId] of rolesToRemove) {
          await targetMember.roles.remove(rId).catch(console.error);
        }

        // Remove any coaching/franchise staff roles if present
        const staffRoleNames = ['franchise owner', 'general manager', 'head coach', 'assistant coach', 'fo', 'gm', 'hc', 'ac', 'co-fo', 'co-owner'];
        const staffRolesToRemove = targetMember.roles.cache.filter(r => 
          staffRoleNames.some(s => r.name.toLowerCase() === s || r.name.toLowerCase().includes(s)) && 
          !r.name.toLowerCase().includes('server') && !r.name.toLowerCase().includes('bot')
        );
        for (const [rId] of staffRolesToRemove) {
          await targetMember.roles.remove(rId).catch(console.error);
        }

        // Assign Free Agent role
        const faRole = interaction.guild.roles.cache.find(r => 
          r.name.toLowerCase() === 'free agent' || 
          r.name.toLowerCase() === 'free agents' || 
          r.name.toLowerCase() === 'fa'
        );
        if (faRole) {
          await targetMember.roles.add(faRole.id).catch(console.error);
        }
      }

      // Remove player from team in Database
      db.removePlayerFromTeam(playerUser.id);

      // --- 5. Post Transaction Announcement ---
      const roleMention = teamRole ? `<@&${teamRole.id}>` : `**${userTeam.name}**`;

      const publicEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle('Player Released')
        .setDescription(`<@${playerUser.id}> (@${playerUser.username}) has been released from ${roleMention}`)
        .addFields(
          { name: 'Released By', value: `<@${interaction.user.id}> (@${interaction.user.username})`, inline: false }
        )
        .setImage(playerUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setTimestamp();

      const transactionsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );
      if (transactionsChannel) {
        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Player Released', `Successfully released <@${playerUser.id}> from **${userTeam.name}**.`)]
      });

    } catch (err) {
      console.error('[RELEASE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to release player: ${err.message}`)]
      });
    }
  }
};
