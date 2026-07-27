const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin, getUserTeam } = require('../../utils/permissions');
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
    .setName('score')
    .setDescription('Report a match score to the scores channel')
    .addRoleOption(option =>
      option.setName('opponent')
        .setDescription('Select the opponent team role')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('your_score')
        .setDescription('Your team\'s score')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('their_score')
        .setDescription('Opponent\'s score')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('ffl')
        .setDescription('Was this a forfeit (FFL)?')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('screenshot')
        .setDescription('Screenshot proof (required for FFL)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('gif')
        .setDescription('GIF or image URL to attach to score report (optional)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const opponentRole = interaction.options.getRole('opponent');
      const yourScore    = interaction.options.getInteger('your_score');
      const theirScore   = interaction.options.getInteger('their_score');
      const ffl          = interaction.options.getBoolean('ffl') || false;
      const screenshot   = interaction.options.getAttachment('screenshot');
      const gifUrl       = interaction.options.getString('gif');

      const config = require('../../config.json');
      const guild = interaction.guild || interaction.client.guilds.cache.get(config.guildId) || interaction.client.guilds.cache.first();
      const member = guild ? await guild.members.fetch(interaction.user.id).catch(() => interaction.member) : interaction.member;

      // 2. Verify roles for Captain / Crew Owner / Admin permission
      const isOwner = member.roles.cache.some(r => {
        const name = r.name.toLowerCase();
        return name === 'franchise owner' || 
               name === 'franchise owners' || 
               name === 'crew owner' || 
               name === 'crew owners' || 
               name === 'owner' || 
               name === 'owners';
      });

      const isCaptain = member.roles.cache.some(r => {
        const name = r.name.toLowerCase();
        return name.includes('captain') || name.includes('cap');
      });

      const userIsAdmin = isAdmin(member);

      if (!userIsAdmin && !isOwner && !isCaptain) {
        return await interaction.editReply({
          embeds: [errorEmbed('Only captains, crew owners, and admins can post scores.')]
        });
      }

      // 3. Enforce screenshot requirement for FFL
      if (ffl && !screenshot) {
        return await interaction.editReply({
          embeds: [errorEmbed('You must attach a screenshot proof when reporting a forfeit (FFL).')]
        });
      }

      // 4. Identify the reporter's team
      const reporterTeam = getUserTeam(member);

      if (!reporterTeam) {
        return await interaction.editReply({
          embeds: [errorEmbed('Could not detect your team. Make sure you have your team\'s role or are listed in the crew list.')]
        });
      }

      // 5. Identify opponent team
      let opponentTeam = db.getTeams().find(t => 
        (t.roleId && t.roleId === opponentRole.id) || 
        t.name.toLowerCase() === opponentRole.name.toLowerCase()
      );

      if (!opponentTeam) {
        const crewList = readCrewList();
        const crewEntry = crewList.find(e => (e.roleId && e.roleId === opponentRole.id) || (e.team && e.team.toLowerCase() === opponentRole.name.toLowerCase()));
        if (crewEntry) {
          opponentTeam = db.createTeam({
            name: crewEntry.team || opponentRole.name,
            abbreviation: (crewEntry.team || opponentRole.name).substring(0, 4).toUpperCase(),
            roleId: opponentRole.id,
            wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0
          });
        }
      }

      if (!opponentTeam) {
        return await interaction.editReply({
          embeds: [errorEmbed(`The selected opponent role <@&${opponentRole.id}> is not registered as a team in the database.`)]
        });
      }

      if (reporterTeam.id === opponentTeam.id) {
        return await interaction.editReply({
          embeds: [errorEmbed('You cannot report a score against your own team.')]
        });
      }

      // 6. Update records in database
      const repWin  = yourScore > theirScore ? 1 : 0;
      const repLoss = yourScore < theirScore ? 1 : 0;
      const repTie  = yourScore === theirScore ? 1 : 0;

      const oppWin  = theirScore > yourScore ? 1 : 0;
      const oppLoss = theirScore < yourScore ? 1 : 0;
      const oppTie  = yourScore === theirScore ? 1 : 0;

      // Update reporter team stats
      db.updateTeamRecord(reporterTeam.id, {
        wins: repWin,
        losses: repLoss,
        ties: repTie,
        pointsFor: yourScore,
        pointsAgainst: theirScore
      });

      // Update opponent team stats
      db.updateTeamRecord(opponentTeam.id, {
        wins: oppWin,
        losses: oppLoss,
        ties: oppTie,
        pointsFor: theirScore,
        pointsAgainst: yourScore
      });

      // Find the scores channel
      const scoresChannel = guild ? (guild.channels.cache.get(config.channels?.scores) || guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('scores') || c.name.includes('score'))
      )) : null;

      if (!scoresChannel) {
        return await interaction.editReply({
          embeds: [errorEmbed('Scores channel not found in this server. Please create a channel named "scores".')]
        });
      }

      // 7. Build post matching screenshot
      const reporterRoleMention = reporterTeam.roleId ? `<@&${reporterTeam.roleId}>` : `@${reporterTeam.name}`;
      const opponentRoleMention = opponentTeam.roleId ? `<@&${opponentTeam.roleId}>` : `@${opponentTeam.name}`;

      const scoreId = `score_ids:${reporterTeam.id}:${opponentTeam.id}:${yourScore}:${theirScore}`;

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle('Match Result')
        .setDescription(`${reporterRoleMention} **${yourScore} - ${theirScore}** ${opponentRoleMention}`)
        .addFields(
          { name: 'Reporter Team', value: reporterRoleMention, inline: true },
          { name: 'Opponent Team', value: opponentRoleMention, inline: true },
          { name: 'Reported By', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ 
          text: `${scoreId} • Today` 
        });

      const finalImage = screenshot ? screenshot.url : (gifUrl || null);
      if (finalImage) {
        embed.setImage(finalImage);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`flag_score_${reporterTeam.id}_${opponentTeam.id}_${yourScore}_${theirScore}`)
          .setLabel('Flag as False Score')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚩')
      );

      // Post the scores message
      await scoresChannel.send({
        content: `${reporterRoleMention} vs ${opponentRoleMention}`,
        embeds: [embed],
        components: [row]
      });

      // Auto update power rankings channel message
      const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
      await updatePowerRankingsMessage(interaction.guild).catch(console.error);

      await interaction.editReply({
        embeds: [successEmbed('Score Reported', `Successfully reported the match score to <#${scoresChannel.id}>!`)]
      });

    } catch (err) {
      console.error('[SCORE REPORT] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to report score: ${err.message}`)]
      });
    }
  }
};
