// commands/strikes/strikecrew.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { updateCrewListMessage } = require('../../utils/crewListMessage');
const { updatePowerRankingsMessage } = require('../../utils/powerRankings');
const db = require('../../database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CREW_STRIKES_PATH = path.join(__dirname, '../../data/crew_strikes.json');
const CREWLIST_PATH = path.join(__dirname, '../../data/crewlist.json');

function readCrewStrikes() {
  try {
    if (!fs.existsSync(CREW_STRIKES_PATH)) {
      fs.writeFileSync(CREW_STRIKES_PATH, JSON.stringify([]), 'utf8');
    }
    return JSON.parse(fs.readFileSync(CREW_STRIKES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeCrewStrikes(data) {
  fs.writeFileSync(CREW_STRIKES_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readCrewList() {
  try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); }
  catch { return []; }
}

function writeCrewList(data) {
  fs.writeFileSync(CREWLIST_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strikecrew')
    .setDescription('Issue a strike to a crew for the current season')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('The crew/team to strike')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for issuing the strike')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('Additional notes or proof')
        .setRequired(false)),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const teams = db.getTeams();
    const filtered = teams
      .filter(t => t.name.toLowerCase().includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(t => ({ name: t.name, value: t.name }))
    );
  },

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('You must be an admin to issue crew strikes.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const inputTeam = interaction.options.getString('team');
      const reason    = interaction.options.getString('reason');
      const notes     = interaction.options.getString('notes');

      // Check if team exists in database
      const dbTeam = db.getTeam(inputTeam) || db.getTeams().find(t => t.name.toLowerCase() === inputTeam.toLowerCase());
      if (!dbTeam) {
        return await interaction.editReply({
          embeds: [errorEmbed(`Team "${inputTeam}" is not registered in the bot's database.`)]
        });
      }

      const teamName = dbTeam.name;
      const crewRole = (dbTeam.roleId && interaction.guild.roles.cache.has(dbTeam.roleId))
        ? interaction.guild.roles.cache.get(dbTeam.roleId)
        : interaction.guild.roles.cache.find(r => r.name.toLowerCase() === teamName.toLowerCase());
      const crewMention = crewRole ? `<@&${crewRole.id}>` : `**${teamName}**`;

      const strikes = readCrewStrikes();
      const existingTeamStrikes = strikes.filter(s => s.teamName.toLowerCase() === teamName.toLowerCase());
      const totalStrikes = existingTeamStrikes.length + 1;
      const strikeId = crypto.randomBytes(4).toString('hex');

      const strikeRecord = {
        id: strikeId,
        teamName,
        season: 'Season 1',
        reason,
        notes: notes || null,
        issuedById: interaction.user.id,
        createdAt: new Date().toISOString()
      };

      strikes.push(strikeRecord);
      writeCrewStrikes(strikes);

      let autoDeleteNotice = '';

      // Check if crew reached 3 strikes -> AUTO DELETE CREW
      if (totalStrikes >= 3) {
        console.log(`[STRIKE CREW] ${teamName} reached 3 strikes! Auto-deleting crew from league...`);

        const crewList = readCrewList();
        const crewEntry = crewList.find(e => e.team.toLowerCase() === teamName.toLowerCase() || (crewRole && e.roleId === crewRole.id));

        // 1. Remove Franchise Owner / Crew Owner role from owner
        if (crewEntry && crewEntry.ownerId) {
          const ownerMember = await interaction.guild.members.fetch(crewEntry.ownerId).catch(() => null);
          if (ownerMember) {
            const allRoles = await interaction.guild.roles.fetch();
            const ownerRole = allRoles.find(r => {
              const name = r.name.toLowerCase();
              return name === 'franchise owner' || name === 'crew owner' || name === 'crew owners';
            });
            if (ownerRole) {
              await ownerMember.roles.remove(ownerRole.id).catch(() => {});
            }
          }
        }

        // 2. Remove team from DB and free rostered players
        db.deleteTeam(teamName);
        if (dbTeam.id) {
          const teamPlayers = db.getTeamPlayers(dbTeam.id);
          for (const p of teamPlayers) {
            db.removePlayerFromTeam(p.discordId);
          }
        }

        // 3. Strip team role and grant Free Agent role to members
        if (crewRole) {
          const faRole = interaction.guild.roles.cache.find(r => 
            r.name.toLowerCase() === 'free agent' || r.name.toLowerCase() === 'fa'
          );
          for (const [, member] of crewRole.members) {
            await member.roles.remove(crewRole.id).catch(() => {});
            if (faRole) {
              await member.roles.add(faRole.id).catch(() => {});
            }
          }
          // Delete role from server
          await crewRole.delete(`Auto-deleted: Crew reached 3 strikes`).catch(() => {});
        }

        // 4. Remove from crewlist.json
        const filteredCrew = crewList.filter(e => e.team.toLowerCase() !== teamName.toLowerCase() && (crewRole ? e.roleId !== crewRole.id : true));
        writeCrewList(filteredCrew);

        // 5. Refresh live Discord channels
        await updateCrewListMessage(interaction.guild).catch(console.error);
        await updatePowerRankingsMessage(interaction.guild).catch(console.error);

        autoDeleteNotice = `\n\n🚨 **CREW DISQUALIFIED & DELETED**: **${teamName}** reached **3 strikes** and has been **automatically removed** from the league! Roster members have been set to Free Agents.`;
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(totalStrikes >= 3 ? '#E74C3C' : '#E67E22') // Red for 3 strikes, Orange otherwise
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle(totalStrikes >= 3 ? '🚨 Crew Disqualified (3 Strikes)' : '⚠️ Crew Strike Issued')
        .addFields(
          { name: 'Crew', value: crewMention, inline: true },
          { name: 'Season', value: 'Season 1', inline: true },
          { name: 'Total Strikes This Season', value: `**${totalStrikes} / 3**`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        );

      if (notes) {
        embed.addFields({ name: 'Notes', value: notes, inline: false });
      }

      if (autoDeleteNotice) {
        embed.addFields({ name: 'Action Taken', value: autoDeleteNotice, inline: false });
      }

      embed.addFields({ name: 'Issued By', value: `<@${interaction.user.id}>`, inline: false });
      embed.setFooter({ text: `Strike ID: ${strikeId}` });
      embed.setTimestamp();

      // Find channel for crew strikes
      const config = require('../../config.json');
      const strikeChannel = interaction.guild.channels.cache.get(config.channels?.crewStrikes) ||
                            interaction.guild.channels.cache.find(
                              c => c.isTextBased() && (c.name === 'crew-strikes' || c.name === 'crew-strike' || c.name.includes('crew-strike'))
                            ) ||
                            interaction.guild.channels.cache.find(
                              c => c.isTextBased() && c.name.includes('strike') && !c.name.includes('mod-strike')
                            );

      if (strikeChannel) {
        await strikeChannel.send({ content: crewMention, embeds: [embed] });
        await interaction.editReply({
          embeds: [successEmbed('Crew Strike Issued', `Successfully issued strike to ${crewMention}.${autoDeleteNotice}`)]
        });
      } else {
        await interaction.editReply({
          content: crewMention,
          embeds: [embed]
        });
      }

    } catch (err) {
      console.error('[STRIKE CREW] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to issue crew strike: ${err.message}`)]
      });
    }
  }
};
