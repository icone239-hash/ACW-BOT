const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isSuperAdmin } = require('../../utils/permissions');
const { updateCrewListMessage } = require('../../utils/crewListMessage');
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
    .setName('team-delete')
    .setDescription('Deletes a team from the league')
    .addRoleOption(option =>
      option.setName('team_role')
        .setDescription('Select the team role to delete')
        .setRequired(true)),

  async execute(interaction) {
    if (!isSuperAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be a super admin to use this command.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const teamRole = interaction.options.getRole('team_role');
    const teamName = teamRole.name;

    // Find team in database by roleId or by name
    const teams = db.getTeams();
    const team = teams.find(t => t.roleId === teamRole.id || t.name.toLowerCase() === teamName.toLowerCase());

    try {
      // 1. Find the owner from crew list
      const crewList = readCrewList();
      const crewEntry = crewList.find(e => e.roleId === teamRole.id || e.team.toLowerCase() === teamName.toLowerCase());
      
      let ownerRemovedMsg = '';
      if (crewEntry && crewEntry.ownerId) {
        const ownerMember = await interaction.guild.members.fetch(crewEntry.ownerId).catch(() => null);
        if (ownerMember) {
          // Fetch all roles to ensure they are up to date in cache
          const allRoles = await interaction.guild.roles.fetch();
          
          // Look for Franchise Owner or Crew Owner/Owners role specifically
          const franchiseOwnerRole = allRoles.find(r => {
            const name = r.name.toLowerCase();
            return name === 'franchise owner' || 
                   name === 'franchise owners' || 
                   name === 'crew owner' || 
                   name === 'crew owners' || 
                   name === 'owner' || 
                   name === 'owners' ||
                   (name.includes('owner') && !name.includes('server') && !name.includes('bot') && !name.includes('play'));
          });

          if (franchiseOwnerRole) {
            let roleRemoved = false;
            await ownerMember.roles.remove(franchiseOwnerRole.id)
              .then(() => {
                roleRemoved = true;
              })
              .catch(e => {
                console.error(`[DELETE] Failed to remove owner role: ${e.message}`);
                ownerRemovedMsg += `\n• ❌ Could not remove role <@&${franchiseOwnerRole.id}>: **${e.message}** (Make sure the bot's role is higher in the roles list than the Franchise Owner role!)`;
              });
            
            if (roleRemoved) {
              ownerRemovedMsg += `\n• Removed Franchise Owner role <@&${franchiseOwnerRole.id}> from <@${crewEntry.ownerId}>`;
            }
          } else {
            ownerRemovedMsg += `\n• ⚠️ *No Franchise Owner role found in server to remove.*`;
          }

          // Remove the team role as well
          await ownerMember.roles.remove(teamRole.id).catch(() => {});
          ownerRemovedMsg += `\n• Removed team role <@&${teamRole.id}> from <@${crewEntry.ownerId}>`;
        }
      }

      // 2. Remove from database (if it exists)
      if (team) {
        db.deleteTeam(team.name);
        
        // Remove players from this team in database
        const teamPlayers = db.getTeamPlayers(team.id);
        for (const player of teamPlayers) {
          db.removePlayerFromTeam(player.discordId);
        }
      } else {
        // If not in database, attempt a raw delete using role name just in case
        db.deleteTeam(teamName);
      }

      // 3. Delete the Discord role itself
      const role = interaction.guild.roles.cache.get(teamRole.id);
      if (role) {
        await role.delete(`Team ${teamName} deleted by ${interaction.user.tag}`).catch(e => {
          console.warn(`[DELETE] Failed to delete role from server: ${e.message}`);
        });
      }

      // 4. Remove from crew list if it exists there
      const filteredCrew = crewList.filter(e => e.team.toLowerCase() !== teamName.toLowerCase() && e.roleId !== teamRole.id);
      if (filteredCrew.length !== crewList.length) {
        writeCrewList(filteredCrew);
        // Edit the live crew list message
        await updateCrewListMessage(interaction.guild);
      }
      
      await interaction.editReply({
        embeds: [successEmbed('Team Deleted', `Team **${teamName}** has been successfully deleted, and its role has been removed.${ownerRemovedMsg}`)]
      });

    } catch (error) {
      console.error('[DELETE] Unhandled Error:', error);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to delete team: ${error.message}`)]
      });
    }
  }
};
