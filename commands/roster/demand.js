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

      const { areTransactionsOpen } = require('../../utils/transactionsHelper');
      const { isAdmin, isSuperAdmin } = require('../../utils/permissions');

      if (!areTransactionsOpen() && !isAdmin(member) && !isSuperAdmin(member)) {
        return await interaction.editReply({
          embeds: [errorEmbed('Transactions Closed', '🔒 Roster transactions are currently **CLOSED** (Playoffs). Crew owners and players cannot demand release at this time.')]
        });
      }

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

      // Fetch fresh roles & fresh member
      await guild.roles.fetch().catch(() => {});
      const targetMember = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);

      const allTeams = db.getTeams();
      const fs = require('fs');
      const path = require('path');
      let crewList = [];
      try {
        crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/crewlist.json'), 'utf8'));
      } catch {}

      const allTeamNames = new Set([
        ...allTeams.map(t => t.name ? t.name.toLowerCase() : ''),
        ...crewList.map(c => c.team ? c.team.toLowerCase() : ''),
        teamName.toLowerCase()
      ].filter(Boolean));

      const allTeamRoleIds = new Set([
        ...allTeams.map(t => t.roleId).filter(Boolean),
        ...crewList.map(c => c.roleId).filter(Boolean),
        userTeam.roleId
      ].filter(Boolean));

      let teamRole = userTeam.roleId ? guild.roles.cache.get(userTeam.roleId) : null;
      if (!teamRole) {
        teamRole = guild.roles.cache.find(r => r.name.toLowerCase() === teamName.toLowerCase());
      }
      const teamMention = teamRole ? `<@&${teamRole.id}>` : `**${teamName}**`;

      if (targetMember) {
        // Strip ALL team roles from member
        const rolesToRemove = targetMember.roles.cache.filter(role => {
          const nameLower = role.name.toLowerCase();
          return allTeamRoleIds.has(role.id) || allTeamNames.has(nameLower);
        });

        for (const [rId] of rolesToRemove) {
          await targetMember.roles.remove(rId).catch(console.error);
        }

        // Remove team staff/coaching roles if present
        const staffRoleNames = ['franchise owner', 'general manager', 'head coach', 'assistant coach', 'co-fo', 'co-owner'];
        const staffRolesToRemove = targetMember.roles.cache.filter(r => 
          staffRoleNames.some(s => r.name.toLowerCase() === s || r.name.toLowerCase().includes(s)) && 
          !r.name.toLowerCase().includes('server') && !r.name.toLowerCase().includes('bot')
        );
        for (const [rId] of staffRolesToRemove) {
          await targetMember.roles.remove(rId).catch(console.error);
        }

        // Assign Free Agent role
        let faRole = guild.roles.cache.find(r => 
          r.name.toLowerCase() === 'free agent' || 
          r.name.toLowerCase() === 'free agents' || 
          r.name.toLowerCase() === 'fa'
        );
        if (faRole) {
          await targetMember.roles.add(faRole.id).catch(console.error);
        }
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
