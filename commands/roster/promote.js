// commands/roster/promote.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, getConfig, getUserTeam } = require('../../utils/permissions');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

const CREWLIST_PATH = path.join(__dirname, '../../data/crewlist.json');

function readCrewList() {
  try {
    if (!fs.existsSync(CREWLIST_PATH)) return [];
    return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8'));
  } catch {
    return [];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a player to a franchise role in your crew')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to promote')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('franchise_role')
        .setDescription('Select the franchise role for promotion')
        .setRequired(true)
        .addChoices(
          { name: 'Captain', value: 'Captain' },
          { name: 'Head Coach', value: 'Head Coach' },
          { name: 'General Manager', value: 'General Manager' },
          { name: 'Assistant Coach', value: 'Assistant Coach' },
          { name: 'Co-FO / Co-Owner', value: 'Co-Owner' }
        )),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const targetUser    = interaction.options.getUser('player');
      const franchiseRole = interaction.options.getString('franchise_role');
      const userId        = interaction.user.id;

      const crewList = readCrewList();
      const teams    = db.getTeams();
      const config   = getConfig();

      const allowedPromoteRoles = config.promoteRoles || [];
      const hasPromoteRole = interaction.member.roles.cache.some(r => allowedPromoteRoles.includes(r.id));
      const userIsAdmin = isAdmin(interaction.member);

      // 1. Determine Executor's Team
      let userTeam = getUserTeam(interaction.member);

      if (!userTeam && !userIsAdmin && !hasPromoteRole) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'You must be a Franchise Owner (Crew Owner), configured promote role, or Admin to promote players.')]
        });
      }

      // 2. Fetch Target Member and detect team role in Discord or DB
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      let targetPlayer = db.getPlayer(targetUser.id);
      let team = userTeam || (targetPlayer?.teamId ? db.getTeamById(targetPlayer.teamId) : null);

      if (!team && targetMember?.roles?.cache) {
        for (const t of teams) {
          if (
            (t.roleId && targetMember.roles.cache.has(t.roleId)) ||
            targetMember.roles.cache.some(r => r.name.toLowerCase() === t.name.toLowerCase())
          ) {
            team = t;
            break;
          }
        }
      }

      if (!team) {
        return await interaction.editReply({
          embeds: [errorEmbed('Player Not On Roster', `<@${targetUser.id}> is not currently registered on any team roster.`)]
        });
      }

      if (userTeam && String(team.id) !== String(userTeam.id) && !userIsAdmin) {
        return await interaction.editReply({
          embeds: [errorEmbed('Wrong Team', `<@${targetUser.id}> is on **${team.name}**, not your team (**${userTeam.name}**).`)]
        });
      }

      // 3. Check Captain limits if promoting to Captain
      if (franchiseRole.toLowerCase() === 'captain') {
        const captainLimit = (config.franchiseRoles && config.franchiseRoles.captainLimit) || 3;
        const currentCaptains = db.getTeamPlayers(team.id).filter(p => p.position && p.position.toLowerCase() === 'captain');

        if (currentCaptains.length >= captainLimit) {
          return await interaction.editReply({
            embeds: [errorEmbed('Captain Limit Reached', `Your crew already has the maximum number of Captains allowed (**${captainLimit}**).`)]
          });
        }
      }

      // 4. Register / Update position in Database
      db.addPlayer({
        discordId: targetUser.id,
        username: targetUser.username,
        teamId: team.id,
        position: franchiseRole
      });

      // 5. Assign Discord Role
      let roleToAssign = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === franchiseRole.toLowerCase());

      if (!roleToAssign) {
        if (franchiseRole === 'Co-Owner') {
          roleToAssign = interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('co-owner') || r.name.toLowerCase().includes('co-fo'));
        } else if (franchiseRole === 'General Manager') {
          roleToAssign = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'gm' || r.name.toLowerCase().includes('general manager'));
        } else if (franchiseRole === 'Head Coach') {
          roleToAssign = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'hc' || r.name.toLowerCase().includes('head coach'));
        } else if (franchiseRole === 'Assistant Coach') {
          roleToAssign = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'ac' || r.name.toLowerCase().includes('assistant coach'));
        }
      }

      if (targetMember && roleToAssign) {
        await targetMember.roles.add(roleToAssign.id).catch(console.error);
      }

      // 6. Post notice in #transactions channel
      const transactionsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );

      if (transactionsChannel) {
        const teamRoleObj = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());
        const roleMention = teamRoleObj ? `<@&${teamRoleObj.id}>` : `**${team.name}**`;

        let franchiseRoleMention = `**${franchiseRole}**`;
        const discRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === franchiseRole.toLowerCase());
        if (discRole) {
          franchiseRoleMention = `<@&${discRole.id}>`;
        }

        const publicEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          })
          .setTitle('Player Promoted')
          .setDescription(`<@${targetUser.id}> (@${targetUser.username}) has been given ${franchiseRoleMention} in ${roleMention}`)
          .addFields(
            { name: 'Promoted By', value: `<@${interaction.user.id}> (@${interaction.user.username})`, inline: false }
          )
          .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();

        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Player Promoted', `Successfully promoted <@${targetUser.id}> to **${franchiseRole}** of **${team.name}**.`)]
      });

    } catch (err) {
      console.error('[PROMOTE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Promotion Error', `Failed to promote player: ${err.message}`)]
      });
    }
  }
};
