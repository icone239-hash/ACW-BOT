// commands/roster/demand.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserTeam } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demand')
    .setDescription('Demand and execute an immediate release from your current team')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for demanding release (optional)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const user = interaction.user;
      const member = interaction.member;
      const reason = interaction.options.getString('reason') || 'No reason provided';

      // Find user's current team
      let userTeam = getUserTeam(member);

      if (!userTeam) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Signed', 'You are not currently signed to any team roster.')]
        });
      }

      const teamName = userTeam.name;

      // 1. Remove player from DB
      db.removePlayerFromTeam(user.id);

      // 2. Manage Discord Roles
      const ACW_SERVER_ID = '1525985063143997691';
      const guild = interaction.client.guilds.cache.get(ACW_SERVER_ID) || interaction.guild;
      const targetMember = await guild.members.fetch(user.id).catch(() => null);

      let teamRole = userTeam.roleId ? guild.roles.cache.get(userTeam.roleId) : null;
      if (!teamRole) {
        teamRole = guild.roles.cache.find(r => r.name.toLowerCase() === teamName.toLowerCase());
      }
      const teamMention = teamRole ? `<@&${teamRole.id}>` : `**${teamName}**`;

      if (targetMember && teamRole && targetMember.roles.cache.has(teamRole.id)) {
        await targetMember.roles.remove(teamRole.id).catch(console.error);
      }

      // Assign Free Agent role
      let faRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'free agent');
      if (targetMember && faRole) {
        await targetMember.roles.add(faRole.id).catch(console.error);
      }

      // 3. Update live Crew List embed
      const { updateCrewListMessage } = require('../../utils/crewListMessage');
      await updateCrewListMessage(guild).catch(console.error);

      // 4. Post log embed in transactions channel
      const config = require('../../config.json');
      const transactionsChannel = guild.channels.cache.get(config.channels?.transactions) ||
                                   guild.channels.cache.get('1525998986215821382') ||
                                   guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions')));

      const updatedPlayer = db.getPlayer(user.id);
      const transfersCount = updatedPlayer?.transfersUsed || 1;

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: guild.iconURL({ dynamic: true }) 
        })
        .setTitle('Player Demand')
        .setDescription(`<@${user.id}> has demanded their release from ${teamMention}`)
        .addFields(
          { name: 'Transfers Used', value: `${transfersCount}/5`, inline: false }
        )
        .setImage(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setTimestamp();

      if (transactionsChannel) {
        await transactionsChannel.send({
          content: `${teamMention}`,
          embeds: [embed]
        });

        await interaction.editReply({
          embeds: [successEmbed('Release Demanded', `You have successfully demanded a release from **${teamName}**. You are now a Free Agent! Logged in <#${transactionsChannel.id}>.`)]
        });
      } else {
        await interaction.editReply({
          embeds: [successEmbed('Release Demanded', `You have successfully demanded a release from **${teamName}**. You are now a Free Agent!`)]
        });
      }

    } catch (err) {
      console.error('[DEMAND] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Demand Error', `Failed to process release demand: ${err.message}`)]
      });
    }
  }
};
