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
      if (guild) {
        const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
        await updatePowerRankingsMessage(guild).catch(console.error);
      }

      const transactionsChannel = guild ? (
        guild.channels.cache.get('1525998986215821382') ||
        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')))
      ) : null;

      const announceEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ 
          name: 'ACW S1 | League Operations', 
          iconURL: guild ? guild.iconURL({ dynamic: true }) : null 
        })
        .setTitle('🔓 Transactions, Scores & Power Rankings Open')
        .setDescription('@everyone **Roster transactions, score submissions, and Power Rankings are now OPEN!**\n\n- Roster modifications (`/sign`, `/demand`, `/release`, `/transfer`) are enabled.\n- Score submissions (`/score`) are open.\n- Power Rankings & standings are active.')
        .setTimestamp();

      if (transactionsChannel) {
        await transactionsChannel.send({
          content: '@everyone',
          embeds: [announceEmbed]
        }).catch(console.error);
      }

      await interaction.editReply({
        embeds: [successEmbed('League Operations Opened', '🔓 Roster transactions, score submissions, and Power Rankings have been **OPENED**.')]
      });

    } catch (err) {
      console.error('[OPEN TRANSACTIONS] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Failed to open transactions: ${err.message}`)]
      });
    }
  }
};
