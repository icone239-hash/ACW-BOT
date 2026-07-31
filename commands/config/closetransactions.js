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
      const transactionsChannel = guild ? (
        guild.channels.cache.get('1525998986215821382') ||
        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')))
      ) : null;

      const announceEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Playoffs & Transactions', 
          iconURL: guild ? guild.iconURL({ dynamic: true }) : null 
        })
        .setTitle('🔒 Roster Transactions Closed')
        .setDescription('@everyone **Roster transactions are now CLOSED for Playoffs!**\n\nCrew owners and players cannot `/sign`, `/demand`, `/release`, `/transfer`, or trade players at this time.')
        .setTimestamp();

      if (transactionsChannel) {
        await transactionsChannel.send({
          content: '@everyone',
          embeds: [announceEmbed]
        }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Transactions Closed', '🔒 Roster transactions have been **CLOSED**. Crew owners and players can no longer sign, demand, release, or trade players.')]
      });

    } catch (err) {
      console.error('[CLOSE TRANSACTIONS] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to close transactions: ${err.message}`)]
      });
    }
  }
};
