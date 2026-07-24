const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-team')
    .setDescription('Shows a team\'s stats')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('The name of the team')
        .setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('team');

    const team = db.getTeam(name);
    if (!team) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Team does not exist.')], ephemeral: true });
    }

    try {
      const diff = team.pointsFor - team.pointsAgainst;
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`Team Stats: ${team.name}`)
        .addFields(
          { name: 'Record', value: `${team.wins}-${team.losses}-${team.ties}`, inline: true },
          { name: 'Points For (PF)', value: `${team.pointsFor}`, inline: true },
          { name: 'Points Against (PA)', value: `${team.pointsAgainst}`, inline: true },
          { name: 'Point Differential', value: `${diff > 0 ? '+' : ''}${diff}`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch team stats.')], ephemeral: true });
    }
  }
};
