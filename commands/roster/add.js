const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster-add')
    .setDescription('Adds a player to a team')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('The name of the team')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to add')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('position')
        .setDescription('The player position')
        .setRequired(false)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], flags: MessageFlags.Ephemeral });
    }
    
    const teamName = interaction.options.getString('team');
    const playerUser = interaction.options.getUser('player');
    const position = interaction.options.getString('position') || 'N/A';

    const team = db.getTeam(teamName);
    if (!team) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Team does not exist.')], flags: MessageFlags.Ephemeral });
    }

    try {
      const existingPlayer = db.getPlayer(playerUser.id);
      if (existingPlayer && existingPlayer.teamId && existingPlayer.teamId !== team.id) {
        const currentTeam = db.getTeamById(existingPlayer.teamId);
        return interaction.reply({
          embeds: [errorEmbed('Already Signed', `<@${playerUser.id}> is already signed to **${currentTeam ? currentTeam.name : 'another team'}**! Release them first or use /roster-transfer.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      // --- Enforce 10 Player Max Roster Cap ---
      await Promise.race([
        interaction.guild.members.fetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 2500))
      ]).catch(() => {});

      const dbPlayers = db.getTeamPlayers(team.id);
      let teamRole = team.roleId ? interaction.guild.roles.cache.get(team.roleId) : interaction.guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());
      const teamMembers = teamRole ? teamRole.members : new Map();
      const fs = require('fs');
      const path = require('path');
      const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/crewlist.json'), 'utf8'));
      const crewEntry = crewList.find(e => e.team.toLowerCase() === team.name.toLowerCase() || (team.roleId && e.roleId === team.roleId));

      const allPlayerIds = new Set(Array.from(teamMembers.keys()));
      for (const p of dbPlayers) {
        if (p.discordId) allPlayerIds.add(p.discordId);
      }
      if (crewEntry?.ownerId) allPlayerIds.add(crewEntry.ownerId);

      if (allPlayerIds.size >= 10) {
        return interaction.reply({
          embeds: [errorEmbed('Roster Full', `🔒 **${team.name}** roster is full (**${allPlayerIds.size}/10**). Teams cannot have more than 10 players. Release a player first.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      db.addPlayer({
        discordId: playerUser.id,
        username: playerUser.username,
        teamId: team.id,
        position
      });

      // Automatically assign Discord team role & remove Free Agent role
      const member = await interaction.guild.members.fetch(playerUser.id).catch(() => null);
      if (member) {
        if (team.roleId) {
          await member.roles.add(team.roleId).catch(console.error);
        }
        const faRole = interaction.guild.roles.cache.find(r => 
          r.name.toLowerCase() === 'free agent' || 
          r.name.toLowerCase() === 'free agents' || 
          r.name.toLowerCase() === 'fa'
        );
        if (faRole && member.roles.cache.has(faRole.id)) {
          await member.roles.remove(faRole.id).catch(console.error);
        }
      }

      await interaction.reply({
        embeds: [successEmbed('Player Added', `Added <@${playerUser.id}> to **${team.name}** as **${position}**!`)]
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to add player.')], flags: MessageFlags.Ephemeral });
    }
  }
};
