// commands/strikes/resetcrewoffenses.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

const CREW_STRIKES_PATH = path.join(__dirname, '../../data/crew_strikes.json');

function readCrewStrikes() {
  try {
    if (!fs.existsSync(CREW_STRIKES_PATH)) {
      fs.writeFileSync(CREW_STRIKES_PATH, JSON.stringify([]), 'utf8');
    }
    return JSON.parse(fs.readFileSync(CREW_STRIKES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeCrewStrikes(data) {
  fs.writeFileSync(CREW_STRIKES_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetcrewoffenses')
    .setDescription('Reset crew strikes for a crew or for all crews')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('Select or type crew name (optional - resets all crews if omitted)')
        .setRequired(false)
        .setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const teams = db.getTeams();
    const filtered = teams
      .filter(t => t.name.toLowerCase().includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(t => ({ name: t.name, value: t.name }))
    );
  },

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('You must be an admin to reset crew strikes.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const inputTeam = interaction.options.getString('team');
      const strikes   = readCrewStrikes();
      const initialCount = strikes.length;

      let filtered;
      let targetText = 'All Crews';

      if (inputTeam) {
        const dbTeam = db.getTeam(inputTeam) || db.getTeams().find(t => t.name.toLowerCase() === inputTeam.toLowerCase());
        const teamName = dbTeam ? dbTeam.name : inputTeam;
        
        const crewRole = dbTeam && dbTeam.roleId && interaction.guild.roles.cache.has(dbTeam.roleId)
          ? interaction.guild.roles.cache.get(dbTeam.roleId)
          : interaction.guild.roles.cache.find(r => r.name.toLowerCase() === teamName.toLowerCase());

        targetText = crewRole ? `<@&${crewRole.id}>` : `**${teamName}**`;
        filtered = strikes.filter(s => s.teamName.toLowerCase() !== teamName.toLowerCase());
      } else {
        filtered = [];
      }

      const removedCount = initialCount - filtered.length;

      if (removedCount === 0) {
        return await interaction.editReply({
          embeds: [errorEmbed('No Strikes Found', `No active crew strikes found for ${targetText}.`)]
        });
      }

      writeCrewStrikes(filtered);

      // Log in crew-strikes channel
      const config = require('../../config.json');
      const ACW_SERVER_ID = '1525985063143997691';
      const guild = interaction.client.guilds.cache.get(ACW_SERVER_ID) || interaction.guild;

      const strikeChannel = guild.channels.cache.get(config.channels?.crewStrikes) ||
                            guild.channels.cache.find(
                              c => c.isTextBased() && (c.name === 'crew-strikes' || c.name === 'crew-strike' || c.name.includes('crew-strike'))
                            ) ||
                            guild.channels.cache.find(
                              c => c.isTextBased() && c.name.includes('strike') && !c.name.includes('mod-strike')
                            );

      const embed = new EmbedBuilder()
        .setColor('#2ECC71') // Green
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: guild.iconURL({ dynamic: true }) 
        })
        .setTitle('✅ Crew Strikes Reset')
        .setDescription(`Crew strikes have been reset for ${targetText}!`)
        .addFields(
          { name: 'Crew', value: targetText, inline: true },
          { name: 'Strikes Removed', value: `${removedCount}`, inline: true },
          { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: false }
        )
        .setTimestamp();

      if (strikeChannel) {
        await strikeChannel.send({ embeds: [embed] });
        await interaction.editReply({
          embeds: [successEmbed('Crew Strikes Reset', `Successfully reset ${removedCount} crew strike(s) for ${targetText}. Notice logged in <#${strikeChannel.id}>.`)]
        });
      } else {
        await interaction.editReply({
          embeds: [successEmbed('Crew Strikes Reset', `Successfully reset ${removedCount} crew strike(s) for ${targetText}.`)]
        });
      }

    } catch (err) {
      console.error('[RESET CREW OFFENSES] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Reset Error', `Failed to reset crew offenses: ${err.message}`)]
      });
    }
  }
};
