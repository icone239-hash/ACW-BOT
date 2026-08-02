const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, isSuperAdmin } = require('../../utils/permissions');
const db = require('../../database');
const fs = require('fs');
const path = require('path');

const CREWLIST_PATH = path.join(__dirname, '../../data/crewlist.json');

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modscore')
    .setDescription('Post a match score on behalf of any two teams (Staff/Admin only)')
    .addRoleOption(option =>
      option.setName('team1')
        .setDescription('Select the first team role')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('score1')
        .setDescription('Score of the first team')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('team2')
        .setDescription('Select the second team role')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('score2')
        .setDescription('Score of the second team')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('ffl')
        .setDescription('Was this a forfeit (FFL)?')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('gif')
        .setDescription('GIF or image URL to attach (optional)')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('proof')
        .setDescription('Screenshot proof (optional)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const config = require('../../config.json');
      const guild = interaction.guild || interaction.client.guilds.cache.get(config.guildId) || interaction.client.guilds.cache.first();
      const member = guild ? await guild.members.fetch(interaction.user.id).catch(() => interaction.member) : interaction.member;

      // 1. Permission check
      const userIsAdmin = isAdmin(member) || isSuperAdmin(member);
      if (!userIsAdmin) {
        return await interaction.editReply({
          embeds: [errorEmbed('Permission Denied', 'You must be a Staff/Admin to use /modscore.')]
        });
      }

      const { areTransactionsOpen } = require('../../utils/transactionsHelper');
      if (!areTransactionsOpen() && !isSuperAdmin(member)) {
        return await interaction.editReply({
          embeds: [errorEmbed('Scores Closed', '🔒 Score reporting and regular season games are currently **CLOSED** for Playoffs.')]
        });
      }

      const team1Role = interaction.options.getRole('team1');
      const score1    = interaction.options.getInteger('score1');
      const team2Role = interaction.options.getRole('team2');
      const score2    = interaction.options.getInteger('score2');
      const ffl       = interaction.options.getBoolean('ffl') || false;
      const gifUrl    = interaction.options.getString('gif');
      const proof     = interaction.options.getAttachment('proof');

      if (team1Role.id === team2Role.id) {
        return await interaction.editReply({
          embeds: [errorEmbed('Invalid Match', 'Team 1 and Team 2 cannot be the same role.')]
        });
      }

      // 2. Identify Team 1 in DB
      let t1Db = db.getTeams().find(t => 
        (t.roleId && t.roleId === team1Role.id) || 
        t.name.toLowerCase() === team1Role.name.toLowerCase()
      );
      if (!t1Db) {
        const crewList = readCrewList();
        const crewEntry = crewList.find(e => (e.roleId && e.roleId === team1Role.id) || (e.team && e.team.toLowerCase() === team1Role.name.toLowerCase()));
        t1Db = db.createTeam({
          name: crewEntry?.team || team1Role.name,
          abbreviation: (crewEntry?.team || team1Role.name).substring(0, 4).toUpperCase(),
          roleId: team1Role.id,
          wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0
        });
      }

      // 3. Identify Team 2 in DB
      let t2Db = db.getTeams().find(t => 
        (t.roleId && t.roleId === team2Role.id) || 
        t.name.toLowerCase() === team2Role.name.toLowerCase()
      );
      if (!t2Db) {
        const crewList = readCrewList();
        const crewEntry = crewList.find(e => (e.roleId && e.roleId === team2Role.id) || (e.team && e.team.toLowerCase() === team2Role.name.toLowerCase()));
        t2Db = db.createTeam({
          name: crewEntry?.team || team2Role.name,
          abbreviation: (crewEntry?.team || team2Role.name).substring(0, 4).toUpperCase(),
          roleId: team2Role.id,
          wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0
        });
      }

      // 4. Update team records
      const t1Win  = score1 > score2 ? 1 : 0;
      const t1Loss = score1 < score2 ? 1 : 0;
      const t1Tie  = score1 === score2 ? 1 : 0;

      const t2Win  = score2 > score1 ? 1 : 0;
      const t2Loss = score2 < score1 ? 1 : 0;
      const t2Tie  = score1 === score2 ? 1 : 0;

      db.updateTeamRecord(t1Db.id, {
        wins: t1Win,
        losses: t1Loss,
        ties: t1Tie,
        pointsFor: score1,
        pointsAgainst: score2
      });

      db.updateTeamRecord(t2Db.id, {
        wins: t2Win,
        losses: t2Loss,
        ties: t2Tie,
        pointsFor: score2,
        pointsAgainst: score1
      });

      // 5. Scores channel
      const scoresChannel = guild ? (guild.channels.cache.get(config.channels?.scores) || guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('scores') || c.name.includes('score'))
      )) : null;

      if (!scoresChannel) {
        return await interaction.editReply({
          embeds: [errorEmbed('Scores channel not found in this server. Please create a channel named "scores".')]
        });
      }

      const t1Mention = t1Db.roleId ? `<@&${t1Db.roleId}>` : `@${t1Db.name}`;
      const t2Mention = t2Db.roleId ? `<@&${t2Db.roleId}>` : `@${t2Db.name}`;
      const scoreId = `score_ids:${t1Db.id}:${t2Db.id}:${score1}:${score2}`;

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Staff Match Report', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle('Match Result (Staff Score)')
        .setDescription(`${t1Mention} **${score1} - ${score2}** ${t2Mention}${ffl ? ' *(FFL)*' : ''}`)
        .addFields(
          { name: 'Team 1', value: t1Mention, inline: true },
          { name: 'Team 2', value: t2Mention, inline: true },
          { name: 'Posted By Mod', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ 
          text: `${scoreId} • Today` 
        });

      const finalImage = proof ? proof.url : (gifUrl || null);
      if (finalImage) {
        embed.setImage(finalImage);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`flag_score_${t1Db.id}_${t2Db.id}_${score1}_${score2}`)
          .setLabel('Flag as False Score')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚩')
      );

      await scoresChannel.send({
        content: `${t1Mention} vs ${t2Mention}`,
        embeds: [embed],
        components: [row]
      });

      // Update power rankings
      const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
      await updatePowerRankingsMessage(interaction.guild).catch(console.error);

      await interaction.editReply({
        embeds: [successEmbed('Staff Score Reported', `Successfully posted match result for **${t1Db.name}** vs **${t2Db.name}** to <#${scoresChannel.id}>!`)]
      });

    } catch (err) {
      console.error('[MODSCORE] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to post mod score: ${err.message}`)]
      });
    }
  }
};
