const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strikes-list')
    .setDescription('Lists all users who have active strikes'),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }

    try {
      const allStrikes = db.getStrikes();
      const strikeCounts = {};
      
      allStrikes.forEach(s => {
        strikeCounts[s.discordId] = (strikeCounts[s.discordId] || 0) + 1;
      });

      const sortedUsers = Object.keys(strikeCounts).sort((a, b) => strikeCounts[b] - strikeCounts[a]);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('All Active Strikes');

      if (sortedUsers.length === 0) {
        embed.setDescription('There are no active strikes.');
      } else {
        let desc = '';
        sortedUsers.forEach(userId => {
          desc += `<@${userId}> - ${strikeCounts[userId]} strikes\n`;
        });
        embed.setDescription(desc);
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to fetch strike list.')], ephemeral: true });
    }
  }
};
