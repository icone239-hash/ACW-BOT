// commands/roster/disband.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

const PLAYERS_DB_PATH = path.join(__dirname, '../../data/players.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disband')
    .setDescription('Disband your player contract and leave your team'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.user.id;
    const player = db.getPlayer(userId);
    let team = null;

    if (player && player.teamId) {
      team = db.getTeamById(player.teamId);
    }

    // Fallback: If not registered in database, check if they have any team role in Discord
    if (!team) {
      const teams = db.getTeams();
      const member = interaction.member;
      team = teams.find(t => 
        (t.roleId && member.roles.cache.has(t.roleId)) ||
        member.roles.cache.some(r => r.name.toLowerCase() === t.name.toLowerCase())
      );
    }

    if (!team) {
      return await interaction.editReply({
        embeds: [errorEmbed('You are not currently on any team roster or assigned a team role.')]
      });
    }

    try {
      // Find Discord team role
      const teamRole = team.roleId 
        ? interaction.guild.roles.cache.get(team.roleId)
        : interaction.guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());

      // 1. Remove team role from the player and assign Free Agent role
      if (teamRole) {
        await interaction.member.roles.remove(teamRole.id).catch(err => {
          console.warn(`[DISBAND] Failed to remove team role: ${err.message}`);
        });
      }

      const faRole = interaction.guild.roles.cache.find(r => 
        r.name.toLowerCase() === 'free agent' || 
        r.name.toLowerCase() === 'free agents' || 
        r.name.toLowerCase() === 'fa'
      );
      if (faRole) {
        await interaction.member.roles.add(faRole.id).catch(err => {
          console.warn(`[DISBAND] Failed to assign Free Agent role: ${err.message}`);
        });
      }

      // 2. Remove player from team in SQLite database
      db.removePlayerFromTeam(userId);

      // 3. Increment transfers count in players.json
      let transfersUsed = 1;
      try {
        const players = JSON.parse(fs.readFileSync(PLAYERS_DB_PATH, 'utf8'));
        const pEntry = players.find(p => p.discordId === userId);
        if (pEntry) {
          pEntry.transfersUsed = (pEntry.transfersUsed || 0) + 1;
          transfersUsed = pEntry.transfersUsed;
          fs.writeFileSync(PLAYERS_DB_PATH, JSON.stringify(players, null, 2), 'utf8');
        }
      } catch (err) {
        console.error('[DISBAND] Failed to increment transfers:', err);
      }

      // 4. Post notice to #transactions channel
      const transactionsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );

      if (transactionsChannel) {
        const teamDisplay = teamRole ? `<@&${teamRole.id}>` : `**${team.name}**`;
        const publicEmbed = new EmbedBuilder()
          .setColor('#E67E22') // Orange
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          })
          .setTitle('Player Demand')
          .setDescription(`<@${userId}> has demanded their release from ${teamDisplay}`)
          .addFields(
            { name: 'Transfers Used', value: `${transfersUsed}/5` }
          )
          .setTimestamp();

        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

      // 5. Reply
      await interaction.editReply({
        embeds: [successEmbed('Contract Disbanded', `Successfully left **${team.name}**. You are now a Free Agent.`)]
      });

    } catch (err) {
      console.error('[DISBAND] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to disband contract: ${err.message}`)]
      });
    }
  }
};
