const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readStats } = require('../../utils/ticketStats');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets-leaderboard')
    .setDescription('Shows the ticket resolver leaderboard for staff'),

  async execute(interaction) {
    await interaction.deferReply();

    const data = readStats();
    const statsList = Object.entries(data.stats).map(([id, s]) => ({
      id,
      username: s.username,
      claimed: s.claimed || 0,
      closed: s.closed || 0
    }));

    // Sort by closed tickets (points) desc, then claimed desc
    statsList.sort((a, b) => b.closed - a.closed || b.claimed - a.claimed);

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({
        name: 'ACW S1 | Tickets Leaderboard',
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTitle('🏆 Staff Ticket Resolver Leaderboard')
      .setTimestamp()
      .setFooter({ text: interaction.guild.name });

    if (statsList.length === 0) {
      embed.setDescription('No tickets have been claimed and closed yet.');
    } else {
      let desc = '';
      statsList.forEach((s, idx) => {
        desc += `**${idx + 1}.** <@${s.id}> — **${s.closed}** resolved (Claimed: ${s.claimed})\n`;
      });
      embed.setDescription(desc);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
