// commands/team/crewnamechange.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crewnamechange')
    .setDescription('Change a crew name and colors (updates DB, Discord role, and logs the change)')
    .addRoleOption(option =>
      option.setName('crew-role')
        .setDescription('Select the crew role you want to change')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('new-name')
        .setDescription('Enter the new name for the crew')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('primary-color')
        .setDescription('New primary color for the crew (e.g. blue or #00FF7F)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('secondary-color')
        .setDescription('New secondary color for the crew (e.g. green or #00FF00)')
        .setRequired(false)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const crewRole = interaction.options.getRole('crew-role');
    const newName = interaction.options.getString('new-name');
    const colorOpt = interaction.options.getString('primary-color');
    const color2Opt = interaction.options.getString('secondary-color');

    // Find the team in the database by role ID or name matching
    const teams = db.getTeams();
    const dbTeam = teams.find(t => t.roleId === crewRole.id || t.name.toLowerCase() === crewRole.name.toLowerCase());
    
    if (!dbTeam) {
      return interaction.editReply({
        embeds: [errorEmbed('Error', `Role <@&${crewRole.id}> is not registered as a crew in the database.`)]
      });
    }

    const oldName = dbTeam.name;

    // Check if new name already exists for ANOTHER team
    const nameConflict = teams.find(t => t.name.toLowerCase() === newName.toLowerCase() && t.id !== dbTeam.id);
    if (nameConflict) {
      return interaction.editReply({
        embeds: [errorEmbed('Error', `A crew named **${newName}** already exists in the database.`)]
      });
    }

    const colorMap = {
      pink: '#FFC0CB',
      red: '#FF0000',
      blue: '#0000FF',
      green: '#00FF00',
      yellow: '#FFFF00',
      purple: '#800080',
      orange: '#FFA500',
      black: '#000001',
      white: '#FFFFFF',
      gold: '#FFD700'
    };

    const resolveColor = (input) => {
      if (!input) return null;
      const clean = input.toLowerCase().trim();
      if (colorMap[clean]) return colorMap[clean];
      if (/^#?[0-9A-Fa-f]{6}$/.test(clean)) {
        return clean.startsWith('#') ? clean : `#${clean}`;
      }
      return null;
    };

    const roleColor = resolveColor(colorOpt);
    const secondaryColor = resolveColor(color2Opt);

    try {
      // 1. Rename team in teams.json (database)
      db.renameTeam(dbTeam.name, newName);

      // Update colors in database if specified
      if (roleColor !== null || secondaryColor !== null) {
        db.updateTeamColors(dbTeam.id, roleColor, secondaryColor);
      }

      // Get updated details
      const updatedTeam = db.getTeam(newName);

      // 2. Rename in crewlist.json and update colors
      const crewListPath = path.join(__dirname, '..', '..', 'data', 'crewlist.json');
      if (fs.existsSync(crewListPath)) {
        try {
          const crewList = JSON.parse(fs.readFileSync(crewListPath, 'utf8'));
          const entry = crewList.find(e => e.team.toLowerCase() === oldName.toLowerCase() || e.roleId === crewRole.id);
          if (entry) {
            entry.team = newName;
            if (roleColor !== null) entry.color = roleColor;
            if (secondaryColor !== null) entry.color2 = secondaryColor;
            fs.writeFileSync(crewListPath, JSON.stringify(crewList, null, 2), 'utf8');
          }
        } catch (err) {
          console.error('[CREWNAMECHANGE] Error updating crewlist.json:', err);
        }
      }

      // Also update backup teams.json in data_init/
      const backupTeamsPath = path.join(__dirname, '..', '..', 'data_init', 'teams.json');
      if (fs.existsSync(backupTeamsPath)) {
        try {
          const backupTeams = JSON.parse(fs.readFileSync(backupTeamsPath, 'utf8'));
          const backupTeam = backupTeams.find(t => t.id === dbTeam.id);
          if (backupTeam) {
            backupTeam.name = newName;
            if (roleColor !== null) backupTeam.color = roleColor;
            if (secondaryColor !== null) backupTeam.color2 = secondaryColor;
            fs.writeFileSync(backupTeamsPath, JSON.stringify(backupTeams, null, 2), 'utf8');
          }
        } catch (err) {
          console.error('[CREWNAMECHANGE] Error updating backup teams.json:', err);
        }
      }

      // 3. Update the Discord role name and color
      const role = interaction.guild.roles.cache.get(crewRole.id) || crewRole;
      if (role) {
        await role.setName(newName, `Renamed by Admin ${interaction.user.tag}`).catch(err => {
          console.error(`[CREWNAMECHANGE] Failed to rename Discord role:`, err.message);
        });

        if (roleColor !== null) {
          await role.setColor(roleColor, `Color changed by Admin ${interaction.user.tag}`).catch(err => {
            console.error(`[CREWNAMECHANGE] Failed to change Discord role color:`, err.message);
          });
        }
      }

      // 4. Update the live message in crew list and power rankings
      const { updateCrewListMessage } = require('../../utils/crewListMessage');
      await updateCrewListMessage(interaction.guild).catch(console.error);

      const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
      await updatePowerRankingsMessage(interaction.guild).catch(console.error);

      // 5. Post to transactions channel
      const transactionsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );
      if (transactionsChannel) {
        const embed = new EmbedBuilder()
          .setColor(roleColor || updatedTeam.color || '#ED4245')
          .setTitle('Crew Renamed')
          .setDescription(`**${oldName}** has changed their name to **${newName}**`)
          .addFields(
            { name: 'Role Mention', value: `<@&${crewRole.id}>`, inline: true },
            { name: 'Changed By', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setTimestamp();

        if (updatedTeam.color) {
          embed.addFields({ name: 'Primary Color', value: updatedTeam.color, inline: true });
        }
        if (updatedTeam.color2) {
          embed.addFields({ name: 'Secondary Color', value: updatedTeam.color2, inline: true });
        }

        await transactionsChannel.send({ embeds: [embed] }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Crew Renamed', `Successfully renamed crew **${oldName}** to **${newName}**.`)]
      });

    } catch (err) {
      console.error('[CREWNAMECHANGE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to change crew name: ${err.message}`)]
      });
    }
  }
};
