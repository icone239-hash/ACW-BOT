// commands/general/suspension.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

const SUSPENSIONS_PATH = path.join(__dirname, '../../data/suspensions.json');

function readSuspensions() {
  try {
    if (!fs.existsSync(SUSPENSIONS_PATH)) {
      fs.writeFileSync(SUSPENSIONS_PATH, JSON.stringify([]), 'utf8');
    }
    return JSON.parse(fs.readFileSync(SUSPENSIONS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeSuspensions(data) {
  fs.writeFileSync(SUSPENSIONS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const PRESET_CHOICES = [
  { name: 'Possession Of Exploits', value: 'Possession Of Exploits' },
  { name: 'Exploiting', value: 'Exploiting' },
  { name: 'Ducking ss', value: 'Ducking ss' },
  { name: 'Admin abuse', value: 'Admin abuse' },
  { name: 'Doxxing photos that aren’t public', value: 'Doxxing photos that aren’t public' },
  { name: 'Other / Custom', value: 'Other / Custom' }
];

function getPresetRule(reason, offenseCount) {
  const r = reason.toLowerCase();

  if (r === 'possession of exploits' || r.includes('possession')) {
    if (offenseCount === 1) return { duration: '7 days', bail: '$10' };
    if (offenseCount === 2) return { duration: '14 days', bail: '$30' };
    return { duration: 'Full Season', bail: 'No bail' };
  }

  if (r === 'exploiting' || r.includes('exploit')) {
    if (offenseCount === 1) return { duration: '7 days', bail: '$10' };
    if (offenseCount === 2) return { duration: '14 days', bail: '$30' };
    return { duration: 'Full Season', bail: 'No bail' };
  }

  if (r.includes('duck') || r.includes('ss')) {
    if (offenseCount === 1) return { duration: '1 day', bail: '$5' };
    if (offenseCount === 2) return { duration: '2 days', bail: '$10' };
    if (offenseCount === 3) return { duration: '3 days', bail: '$15' };
    return { duration: 'Full Season', bail: '$30' };
  }

  if (r.includes('admin') || r.includes('abuse')) {
    if (offenseCount === 1) return { duration: '1 day', bail: '$5' };
    if (offenseCount === 2) return { duration: '3 days', bail: '$8' };
    return { duration: 'Full Season', bail: '$20' };
  }

  if (r.includes('dox') || r.includes('photo') || r.includes('private')) {
    if (offenseCount === 1) return { duration: '2 days (+1d timeout)', bail: '$15' };
    return { duration: 'Banned (No Appeal)', bail: 'No bail', banUser: true };
  }

  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suspension')
    .setDescription('Manage player suspensions and bail rules')
    .addSubcommand(sub =>
      sub.setName('suspend')
        .setDescription('Suspend a player from the league')
        .addUserOption(option =>
          option.setName('player')
            .setDescription('Select the player to suspend')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Select reason from dropdown menu')
            .setRequired(true)
            .addChoices(...PRESET_CHOICES))
        .addStringOption(option =>
          option.setName('duration')
            .setDescription('Override duration (optional - auto-calculated from rules)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('bail')
            .setDescription('Override bail amount (optional - auto-calculated from rules)')
            .setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('clearsuspension')
        .setDescription('Clear a false suspension from a player')
        .addUserOption(option =>
          option.setName('player')
            .setDescription('Select the player')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Select reason to clear')
            .setRequired(true)
            .addChoices(...PRESET_CHOICES))
        .addStringOption(option =>
          option.setName('notes')
            .setDescription('Enter notes for clearing (e.g. payed)')
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('resetoffenses')
        .setDescription('Reset suspension offenses for a player')
        .addUserOption(option =>
          option.setName('player')
            .setDescription('Select the player to reset offenses for')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Select specific reason to reset (optional - resets all if omitted)')
            .setRequired(false)
            .addChoices(...PRESET_CHOICES))
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('You must be an admin to suspend players.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const ACW_SERVER_ID = '1525985063143997691';
    const guild = interaction.client.guilds.cache.get(ACW_SERVER_ID) || interaction.guild || interaction.client.guilds.cache.first();

    if (!guild) {
      return interaction.reply({
        embeds: [errorEmbed('Guild Context Missing', 'Could not locate server context to manage suspensions.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'suspend') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const playerUser     = interaction.options.getUser('player');
        const reason         = interaction.options.getString('reason');
        let customDuration   = interaction.options.getString('duration');
        let customBail       = interaction.options.getString('bail');

        const suspensions = readSuspensions();

        // Calculate total offenses for this user
        const userSuspensions = suspensions.filter(s => s.userId === playerUser.id);
        const offenseCount = userSuspensions.length + 1;
        const offenseText = `${getOrdinal(offenseCount)} Offense`;

        // Calculate offenses for this SPECIFIC reason
        const reasonSuspensions = userSuspensions.filter(s => s.reason.toLowerCase() === reason.toLowerCase());
        const reasonOffenseCount = reasonSuspensions.length + 1;

        // Auto-calculate duration & bail if preset rule matches
        const preset = getPresetRule(reason, reasonOffenseCount);
        const duration = customDuration || (preset ? preset.duration : '3 days');
        const bail     = customBail || (preset ? preset.bail : '$5');

        // Grant Suspended role in Discord
        await guild.roles.fetch().catch(() => {});
        const targetMember = await guild.members.fetch(playerUser.id).catch(() => null);
        let suspendedRole = guild.roles.cache.get('1528805481488056452') ||
                            guild.roles.cache.find(r => 
                              r.name.toLowerCase() === 'suspended' || 
                              r.name.toLowerCase() === 'suspension' ||
                              r.name.toLowerCase() === 'suspend'
                            );

        if (!suspendedRole) {
          suspendedRole = await guild.roles.create({
            name: 'Suspended',
            color: '#99aab5',
            reason: 'Create Suspended role'
          });
        }

        if (targetMember && suspendedRole) {
          await targetMember.roles.add(suspendedRole.id).catch(console.error);
        }

        // If rule specifies banning user for 2nd offense Doxxing
        if (preset && preset.banUser && targetMember) {
          await targetMember.ban({ reason: `Doxxing 2nd Offense - ${reason}` }).catch(console.error);
        }

        // Save to suspensions DB
        const newSuspension = {
          id: suspensions.length > 0 ? Math.max(...suspensions.map(s => s.id)) + 1 : 1,
          userId: playerUser.id,
          username: playerUser.username,
          reason,
          duration,
          bailAmount: bail,
          issuedById: interaction.user.id,
          createdAt: new Date().toISOString()
        };
        suspensions.push(newSuspension);
        writeSuspensions(suspensions);

        // Find suspensions channel
        const channel = guild.channels.cache.get(config.channels?.suspensions) ||
                        guild.channels.cache.get('1526012668752953414') ||
                        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('suspension') || c.name.includes('suspensions')));

        let shortDuration = duration;
        if (duration.toLowerCase().includes('day')) {
          const days = duration.split(' ')[0];
          shortDuration = `${days}d`;
        } else if (duration.toLowerCase().includes('season')) {
          shortDuration = 'Season';
        } else if (duration.toLowerCase().includes('permanent') || duration.toLowerCase().includes('ban')) {
          shortDuration = 'Perm';
        }

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const footerText = `Action by ${interaction.user.username} • ${dateStr} at ${timeStr}`;
        const thumbnailURL = guild.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL();

        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('suspension')
          .setDescription(`<@${playerUser.id}> (${playerUser.username}) has been suspended for **${shortDuration}**`)
          .setThumbnail(thumbnailURL)
          .addFields(
            { name: 'Offense', value: offenseText, inline: true },
            { name: 'Total Offenses', value: `${offenseCount}`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Duration', value: duration, inline: true },
            { name: 'Bail', value: bail, inline: true }
          )
          .setFooter({ text: footerText });

        if (channel) {
          await channel.send({
            content: `<@${playerUser.id}>`,
            embeds: [embed]
          });
          await interaction.editReply({
            embeds: [successEmbed('Player Suspended', `Successfully suspended <@${playerUser.id}> with Suspended role assigned. Auto-calculated duration (**${duration}**) and bail (**${bail}**). Notice posted in <#${channel.id}>.`)]
          });
        } else {
          await interaction.editReply({
            embeds: [successEmbed('Player Suspended', `Successfully suspended <@${playerUser.id}> with Suspended role assigned.`)]
          });
        }

      } catch (err) {
        console.error('[SUSPENSION] Error:', err);
        await interaction.editReply({
          embeds: [errorEmbed('Suspension Error', `Failed to suspend player: ${err.message}`)]
        });
      }
      return;
    }

    if (sub === 'clearsuspension') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const playerUser = interaction.options.getUser('player');
        const reason     = interaction.options.getString('reason');
        const notes      = interaction.options.getString('notes');

        const suspensions = readSuspensions();

        const userSuspensions = suspensions.filter(s => s.userId === playerUser.id);
        const matchIdx = suspensions.findIndex(s => s.userId === playerUser.id && s.reason.toLowerCase() === reason.toLowerCase());

        if (matchIdx === -1) {
          return await interaction.editReply({
            embeds: [errorEmbed('Not Found', `No suspension found for <@${playerUser.id}> with reason "${reason}".`)]
          });
        }

        const originalSuspension = suspensions[matchIdx];
        const oldOffenseCount = userSuspensions.length;
        const newOffenseCount = oldOffenseCount - 1;

        suspensions.splice(matchIdx, 1);
        writeSuspensions(suspensions);

        const targetMember = await guild.members.fetch(playerUser.id).catch(() => null);
        let suspensionRemovedText = 'No (not currently active)';

        if (targetMember) {
          const suspendedRole = guild.roles.cache.find(r => 
            r.name.toLowerCase() === 'suspended' || 
            r.name.toLowerCase() === 'suspension' ||
            r.name.toLowerCase() === 'suspend'
          );

          if (suspendedRole && targetMember.roles.cache.has(suspendedRole.id)) {
            const remainingActive = suspensions.some(s => s.userId === playerUser.id);
            if (!remainingActive) {
              await targetMember.roles.remove(suspendedRole.id).catch(console.error);
              suspensionRemovedText = 'Yes';
            } else {
              suspensionRemovedText = 'No (other active suspensions)';
            }
          }
        }

        const channel = guild.channels.cache.get(config.channels?.suspensions) ||
                        guild.channels.cache.get('1526012668752953414') ||
                        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('suspension') || c.name.includes('suspensions')));

        const embed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: guild.iconURL({ dynamic: true }) 
          })
          .setTitle('✅ False Suspension Cleared')
          .setDescription(`<@${playerUser.id}>'s suspension for **${originalSuspension.reason}** has been cleared as false.`)
          .addFields(
            { name: 'Reason Cleared', value: originalSuspension.reason, inline: true },
            { name: 'New Offense Count', value: `${newOffenseCount} (was ${oldOffenseCount})`, inline: true },
            { name: 'Suspension Removed', value: suspensionRemovedText, inline: true },
            { name: 'Notes', value: notes, inline: false },
            { name: 'Cleared By', value: `<@${interaction.user.id}>`, inline: false }
          )
          .setTimestamp();

        if (channel) {
          await channel.send({ embeds: [embed] });
          await interaction.editReply({
            embeds: [successEmbed('Suspension Cleared', `Successfully cleared false suspension for <@${playerUser.id}>. Log posted in <#${channel.id}>.`)]
          });
        } else {
          await interaction.editReply({
            embeds: [successEmbed('Suspension Cleared', `Successfully cleared false suspension for <@${playerUser.id}>.`)]
          });
        }

      } catch (err) {
        console.error('[CLEAR SUSPENSION] Error:', err);
        await interaction.editReply({
          embeds: [errorEmbed('Clear Suspension Error', `Failed to clear suspension: ${err.message}`)]
        });
      }
      return;
    }

    if (sub === 'resetoffenses') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const playerUser = interaction.options.getUser('player');
        const reason     = interaction.options.getString('reason');

        const suspensions = readSuspensions();
        const initialCount = suspensions.length;

        let filtered;
        if (reason) {
          filtered = suspensions.filter(s => !(s.userId === playerUser.id && s.reason.toLowerCase() === reason.toLowerCase()));
        } else {
          filtered = suspensions.filter(s => s.userId !== playerUser.id);
        }

        const removedCount = initialCount - filtered.length;

        if (removedCount === 0) {
          return await interaction.editReply({
            embeds: [errorEmbed('No Offenses Found', `No active or recorded offenses found for <@${playerUser.id}>${reason ? ` under "${reason}"` : ''}.`)]
          });
        }

        writeSuspensions(filtered);

        // Strip Suspended role if no remaining suspensions exist
        const targetMember = await guild.members.fetch(playerUser.id).catch(() => null);
        let roleRemovedText = 'No (not active)';

        if (targetMember) {
          const suspendedRole = guild.roles.cache.find(r => 
            r.name.toLowerCase() === 'suspended' || 
            r.name.toLowerCase() === 'suspension' ||
            r.name.toLowerCase() === 'suspend'
          );

          if (suspendedRole && targetMember.roles.cache.has(suspendedRole.id)) {
            const hasRemaining = filtered.some(s => s.userId === playerUser.id);
            if (!hasRemaining) {
              await targetMember.roles.remove(suspendedRole.id).catch(console.error);
              roleRemovedText = 'Yes (Role Removed)';
            }
          }
        }

        // Post log to suspensions channel
        const channel = guild.channels.cache.get(config.channels?.suspensions) ||
                        guild.channels.cache.get('1526012668752953414') ||
                        guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('suspension') || c.name.includes('suspensions')));

        const embed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: guild.iconURL({ dynamic: true }) 
          })
          .setTitle('✅ Offenses Reset')
          .setDescription(`All suspension offenses for <@${playerUser.id}> have been reset!`)
          .addFields(
            { name: 'Player', value: `<@${playerUser.id}>`, inline: true },
            { name: 'Reason Reset', value: reason || 'All Reasons', inline: true },
            { name: 'Offenses Removed', value: `${removedCount}`, inline: true },
            { name: 'Suspended Role Removed', value: roleRemovedText, inline: false },
            { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: false }
          )
          .setTimestamp();

        if (channel) {
          await channel.send({ embeds: [embed] });
          await interaction.editReply({
            embeds: [successEmbed('Offenses Reset', `Successfully reset ${removedCount} offense(s) for <@${playerUser.id}>. Notice posted in <#${channel.id}>.`)]
          });
        } else {
          await interaction.editReply({
            embeds: [successEmbed('Offenses Reset', `Successfully reset ${removedCount} offense(s) for <@${playerUser.id}>.`)]
          });
        }

      } catch (err) {
        console.error('[RESET OFFENSES] Error:', err);
        await interaction.editReply({
          embeds: [errorEmbed('Reset Error', `Failed to reset offenses: ${err.message}`)]
        });
      }
    }
  }
};
