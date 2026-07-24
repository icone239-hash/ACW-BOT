const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team-info')
    .setDescription('Shows team info')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the team')
        .setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('name');

    const team = db.getTeam(name);
    if (!team) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Team does not exist.')], ephemeral: true });
    }

    const roster = db.getTeamPlayers(team.id);
    const rosterCount = roster ? roster.length : 0;

    const embed = new EmbedBuilder()
      .setColor(team.color || '#ED4245')
      .setTitle(`Team Info: ${team.name}`)
      .addFields(
        { name: 'Record (W-L-T)', value: `${team.wins}-${team.losses}-${team.ties}`, inline: true },
        { name: 'Roster Count', value: `${rosterCount}`, inline: true },
        { name: 'Points For', value: `${team.pointsFor}`, inline: true },
        { name: 'Points Against', value: `${team.pointsAgainst}`, inline: true },
        { name: 'Primary Color', value: team.color || 'Not set', inline: true },
        { name: 'Secondary Color', value: team.color2 || 'Not set', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
