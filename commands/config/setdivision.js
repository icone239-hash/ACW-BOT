// commands/config/setdivision.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin } = require('../../utils/permissions');
const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setdivision')
    .setDescription('Assign a team to a division (North, Central, South, or Gulf) (Admin only)')
    .addRoleOption(option =>
      option.setName('team')
        .setDescription('Select the team role')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('division')
        .setDescription('Select the division')
        .setRequired(true)
        .addChoices(
          { name: 'North Division (American Conference)', value: 'North Division (American Conference)' },
          { name: 'South Division (American Conference)', value: 'South Division (American Conference)' },
          { name: 'Central Division (American Conference)', value: 'Central Division (American Conference)' },
          { name: 'Gulf Division (American Conference)', value: 'Gulf Division (American Conference)' }
        )),

  async execute(interaction) {
    if (!isAdmin(interaction.member) && !isSuperAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an Admin or higher to set team divisions.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const teamRole = interaction.options.getRole('team');
    const division = interaction.options.getString('division');

    try {
      const teams = db.getTeams();
      const dbTeam = teams.find(t => t.roleId === teamRole.id || t.name.toLowerCase() === teamRole.name.toLowerCase());

      if (!dbTeam) {
        return interaction.editReply({
          embeds: [errorEmbed('Not Found', `Could not find team entry for <@&${teamRole.id}> in the database.`)]
        });
      }

      db.updateTeamDivision(dbTeam.id, division);

      // Refresh the live Power Rankings message in Discord
      await updatePowerRankingsMessage(interaction.guild);

      await interaction.editReply({
        embeds: [successEmbed('Division Updated', `Assigned <@&${teamRole.id}> to **${division}**.`)]
      });

    } catch (err) {
      console.error('[SETDIVISION] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to set division: ${err.message}`)]
      });
    }
  }
};
