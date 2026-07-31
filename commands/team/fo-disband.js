// commands/team/fo-disband.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
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
    .setName('fo-disband')
    .setDescription('Franchise Owner disbands their own team'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.user.id;
    const member = interaction.member;

    const { areTransactionsOpen } = require('../../utils/transactionsHelper');
    const { isAdmin, isSuperAdmin } = require('../../utils/permissions');

    if (!areTransactionsOpen() && !isAdmin(member) && !isSuperAdmin(member)) {
      return await interaction.editReply({
        embeds: [errorEmbed('Transactions Closed', '🔒 Roster transactions are currently **CLOSED** (Playoffs). Crew owners cannot disband teams at this time.')]
      });
    }

    const crewList = readCrewList();

    // Find the crew owned by this user
    const crewEntry = crewList.find(e => e.ownerId === userId);

    if (!crewEntry) {
      return await interaction.editReply({
        embeds: [errorEmbed('Not Authorized', 'You are not registered as a Franchise Owner of any team in the crew list.')]
      });
    }

    const teamName = crewEntry.team;

    try {
      // Find the team role in Discord
      let teamRole = crewEntry.roleId ? interaction.guild.roles.cache.get(crewEntry.roleId) : null;
      if (!teamRole) {
        teamRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === teamName.toLowerCase());
      }

      // Find the team in database
      const dbTeam = db.getTeam(teamName);
      let playersReleasedCount = 0;

      // 1. Remove all players on this team from the team in the database
      if (dbTeam) {
        const teamPlayers = db.getTeamPlayers(dbTeam.id);
        playersReleasedCount = teamPlayers.length;
        for (const player of teamPlayers) {
          db.removePlayerFromTeam(player.discordId);
        }
        // Delete the team from database
        db.deleteTeam(dbTeam.name);
      } else {
        // Fallback delete if team in crewlist but database is out of sync
        db.deleteTeam(teamName);
      }

      // 2. Remove the Franchise Owner role from the user
      const allRoles = await interaction.guild.roles.fetch();
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
        await interaction.member.roles.remove(franchiseOwnerRole.id).catch(err => {
          console.warn(`[FO-DISBAND] Failed to remove Franchise Owner role: ${err.message}`);
        });
      }

      // 3. Delete the team's Discord role
      if (teamRole) {
        await teamRole.delete(`Team disbanded by Franchise Owner: ${interaction.user.tag}`).catch(err => {
          console.warn(`[FO-DISBAND] Failed to delete team role: ${err.message}`);
        });
      }

      // 4. Remove from crew list JSON
      const updatedCrewList = crewList.filter(e => e.ownerId !== userId && e.team.toLowerCase() !== teamName.toLowerCase());
      writeCrewList(updatedCrewList);

      // 5. Update crew list live message
      await updateCrewListMessage(interaction.guild).catch(console.error);

      // 6. Update power rankings live message
      await updatePowerRankingsMessage(interaction.guild).catch(console.error);

      // 7. Post transaction notice to #transactions channel
      const transactionsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );
      if (transactionsChannel) {
        const publicEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          })
          .setTitle('Crew Disbanded')
          .setDescription(`**${teamName}** has been self-disbanded by their Franchise Owner.`)
          .addFields(
            { name: 'Franchise Owner', value: `<@${userId}>`, inline: false },
            { name: 'Players Released', value: `${playersReleasedCount}`, inline: false }
          )
          .setImage(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();

        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

      // 8. Send reply
      await interaction.editReply({
        embeds: [successEmbed('Team Disbanded', `Successfully disbanded your team **${teamName}**.`)]
      });

    } catch (err) {
      console.error('[FO-DISBAND] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to disband team: ${err.message}`)]
      });
    }
  }
};
