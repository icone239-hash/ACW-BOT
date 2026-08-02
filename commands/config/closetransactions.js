// commands/config/closetransactions.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin } = require('../../utils/permissions');
const { setTransactionsOpen } = require('../../utils/transactionsHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closetransactions')
    .setDescription('Close roster transactions so crew owners and players cannot sign, demand, or release'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const member = interaction.member;

      if (!isAdmin(member) && !isSuperAdmin(member)) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'Only Staff and Admins can close roster transactions.')]
        });
      }

      setTransactionsOpen(false);

      const guild = interaction.guild;
      if (guild) {
        const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
        await updatePowerRankingsMessage(guild).catch(console.error);
      }

      const transactionsChannel = guild ? (
        guild.channels.cache.get('1525998986215821382') ||
        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')))
      ) : null;

      const announceEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Playoffs', 
          iconURL: guild ? guild.iconURL({ dynamic: true }) : null 
        })
        .setTitle('🔒 Roster Transactions & Scores Closed')
        .setDescription('@everyone **Roster transactions and score submissions are now CLOSED for Playoffs!**')
        .setTimestamp();

      if (transactionsChannel) {
        await transactionsChannel.send({
          content: '@everyone',
          embeds: [announceEmbed]
        }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Playoffs Lockdown Activated', '🔒 Roster transactions, score submissions, and Power Rankings have been **CLOSED** and frozen for the Playoffs.')]
      });

    } catch (err) {
      console.error('[CLOSE TRANSACTIONS] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to close transactions: ${err.message}`)]
      });
    }
  }
};
