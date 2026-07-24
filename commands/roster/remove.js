const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster-remove')
    .setDescription('Removes a player from a team')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('The name of the team')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to remove')
        .setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    
    const teamName = interaction.options.getString('team');
    const playerUser = interaction.options.getUser('player');

    const team = db.getTeam(teamName);
    if (!team) {
      return interaction.editReply({ embeds: [errorEmbed('Not Found', 'Team does not exist.')] });
    }

    const player = db.getPlayer(playerUser.id);
    if (!player || player.teamId !== team.id) {
       return interaction.editReply({ embeds: [errorEmbed('Error', 'Player is not on this team.')] });
    }

    try {
      // Fetch target member to strip role
      const targetMember = await interaction.guild.members.fetch(playerUser.id).catch(() => null);
      const teamRole = team.roleId 
        ? interaction.guild.roles.cache.get(team.roleId)
        : interaction.guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());

      if (targetMember) {
        if (teamRole) {
          await targetMember.roles.remove(teamRole.id).catch(console.error);
        }
        // Give Free Agent role
        const faRole = interaction.guild.roles.cache.find(r => 
          r.name.toLowerCase() === 'free agent' || 
          r.name.toLowerCase() === 'free agents' || 
          r.name.toLowerCase() === 'fa'
        );
        if (faRole) {
          await targetMember.roles.add(faRole.id).catch(console.error);
        }
      }

      db.removePlayerFromTeam(playerUser.id);

      // --- Post transaction post ---
      const { EmbedBuilder } = require('discord.js');
      const displayName = targetMember ? targetMember.displayName : playerUser.username;
      const displayLine = displayName !== playerUser.username 
        ? `${displayName} (@${playerUser.username})` 
        : playerUser.username;

      const teamRoleObj = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());
      const roleMention = teamRoleObj ? `<@&${teamRoleObj.id}>` : `**${team.name}**`;

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

      await interaction.editReply({ embeds: [successEmbed('Player Removed', `<@${playerUser.id}> has been removed from **${team.name}**. `)] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ embeds: [errorEmbed('Error', `Failed to remove player: ${error.message}`)] });
    }
  }
};
