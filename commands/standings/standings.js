const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('standings')
    .setDescription('Shows league standings'),
  async execute(interaction) {
    try {
      const teams = db.getTeams();
      teams.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('League Standings');

      if (!teams || teams.length === 0) {
        embed.setDescription('No teams available.');
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      let desc = '```\n';
      desc += 'Team                | W  | L  | T  | PF  | PA  \n';
      desc += '-------------------------------------------------\n';
      
      teams.forEach(t => {
        let name = t.name.length > 18 ? t.name.substring(0, 15) + '...' : t.name;
        desc += `${name.padEnd(20)}| ${String(t.wins).padEnd(3)}| ${String(t.losses).padEnd(3)}| ${String(t.ties).padEnd(3)}| ${String(t.pointsFor).padEnd(4)}| ${String(t.pointsAgainst).padEnd(4)}\n`;
      });
      desc += '```';

      embed.setDescription(desc);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch standings.')], flags: MessageFlags.Ephemeral });
    }
  }
};
