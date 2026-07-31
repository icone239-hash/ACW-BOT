// commands/config/opentransactions.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin } = require('../../utils/permissions');
const { setTransactionsOpen } = require('../../utils/transactionsHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opentransactions')
    .setDescription('Open roster transactions allowing crew owners and players to sign, demand, or release'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const member = interaction.member;

      if (!isAdmin(member) && !isSuperAdmin(member)) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'Only Staff and Admins can open roster transactions.')]
        });
      }

      setTransactionsOpen(true);

      const guild = interaction.guild;
      const transactionsChannel = guild ? (
        guild.channels.cache.get('1525998986215821382') ||
        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')))
      ) : null;

      const announceEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ 
          name: 'ACW S1 | Roster Transactions', 
          iconURL: guild ? guild.iconURL({ dynamic: true }) : null 
        })
        .setTitle('🔓 Roster Transactions Open')
        .setDescription('@everyone **Roster transactions are now OPEN!**\n\nCrew owners and players can now `/sign`, `/demand`, `/release`, `/transfer`, and trade players.')
        .setTimestamp();

      if (transactionsChannel) {
        await transactionsChannel.send({
          content: '@everyone',
          embeds: [announceEmbed]
        }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('Transactions Opened', '🔓 Roster transactions have been **OPENED**. Crew owners and players can now sign, demand, release, and trade.')]
      });

    } catch (err) {
      console.error('[OPEN TRANSACTIONS] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to open transactions: ${err.message}`)]
      });
    }
  }
};
