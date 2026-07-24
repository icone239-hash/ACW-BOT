// commands/roster/demote.js
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
    .setName('demote')
    .setDescription('Demote a player from a franchise role in your crew')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to demote')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('franchise_role')
        .setDescription('Select the franchise role to demote from')
        .setRequired(true)
        .addChoices(
          { name: 'Captain', value: 'Captain' },
          { name: 'Head Coach', value: 'Head Coach' },
          { name: 'General Manager', value: 'General Manager' },
          { name: 'Assistant Coach', value: 'Assistant Coach' },
          { name: 'Co-FO / Co-Owner', value: 'Co-Owner' },
          { name: 'All Franchise Roles', value: 'All' }
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

      const allowedRoles = [...(config.promoteRoles || []), ...(config.demoteRoles || [])];
      const hasPermissionRole = interaction.member.roles.cache.some(r => allowedRoles.includes(r.id));
      const userIsAdmin = isAdmin(interaction.member);

      // 1. Determine Executor's Team
      let userTeam = getUserTeam(interaction.member);

      if (!userTeam && !userIsAdmin && !hasPermissionRole) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'You must be a Franchise Owner (Crew Owner), authorized role, or Admin to demote players.')]
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

      // 3. Register / Update position in Database
      db.addPlayer({
        discordId: targetUser.id,
        username: targetUser.username,
        teamId: team.id,
        position: 'Player'
      });

      // 4. Remove Discord franchise roles
      if (targetMember) {
        const rolesToRemove = [];
        if (franchiseRole === 'All') {
          ['Captain', 'Head Coach', 'General Manager', 'Assistant Coach', 'Co-Owner', 'Co-FO'].forEach(rName => {
            const r = interaction.guild.roles.cache.find(x => x.name.toLowerCase() === rName.toLowerCase());
            if (r) rolesToRemove.push(r.id);
          });
        } else {
          let r = interaction.guild.roles.cache.find(x => x.name.toLowerCase() === franchiseRole.toLowerCase());
          if (!r) {
            if (franchiseRole === 'Co-Owner') {
              r = interaction.guild.roles.cache.find(x => x.name.toLowerCase().includes('co-owner') || x.name.toLowerCase().includes('co-fo'));
            } else if (franchiseRole === 'General Manager') {
              r = interaction.guild.roles.cache.find(x => x.name.toLowerCase() === 'gm' || x.name.toLowerCase().includes('general manager'));
            } else if (franchiseRole === 'Head Coach') {
              r = interaction.guild.roles.cache.find(x => x.name.toLowerCase() === 'hc' || x.name.toLowerCase().includes('head coach'));
            } else if (franchiseRole === 'Assistant Coach') {
              r = interaction.guild.roles.cache.find(x => x.name.toLowerCase() === 'ac' || x.name.toLowerCase().includes('assistant coach'));
            }
          }
          if (r) rolesToRemove.push(r.id);
        }

        for (const rId of rolesToRemove) {
          await targetMember.roles.remove(rId).catch(console.error);
        }
      }

      // 5. Post notice in #transactions channel
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
          .setTitle('Player Demoted')
          .setDescription(`<@${targetUser.id}> (@${targetUser.username}) has been demoted from ${franchiseRoleMention} in ${roleMention}`)
          .addFields(
            { name: 'Demoted By', value: `<@${interaction.user.id}> (@${interaction.user.username})`, inline: false }
          )
          .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();

        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Player Demoted', `Successfully demoted <@${targetUser.id}> from **${franchiseRole}** on **${team.name}**.`)]
      });

    } catch (err) {
      console.error('[DEMOTE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Demotion Error', `Failed to demote player: ${err.message}`)]
      });
    }
  }
};
