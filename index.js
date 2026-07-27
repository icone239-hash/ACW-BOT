require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { errorEmbed } = require('./utils/embeds');

// --- Railway / Cloud HTTP Health Check Server ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('ACW Bot Online')).listen(PORT, () => {
  console.log(`[HTTP] Health check server listening on port ${PORT}`);
});

// --- Persistent Volume Database Initialization ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dataInitDir = path.join(__dirname, 'data_init');
if (fs.existsSync(dataInitDir)) {
  const files = fs.readdirSync(dataInitDir);
  for (const file of files) {
    const destPath = path.join(dataDir, file);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(path.join(dataInitDir, file), destPath);
      console.log(`[INIT] Populated missing persistent volume file: ${file}`);
    }
  }
}

const config = require('./config.json');
require('./database'); // init db

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Crash Prevention & Error Handling ---
client.on('error', console.error);
process.on('unhandledRejection', error => {
  console.error('[UNHANDLED REJECTION]', error);
});
process.on('uncaughtException', error => {
  console.error('[UNCAUGHT EXCEPTION]', error);
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.lstatSync(folderPath).isDirectory()) continue;
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      command.category = folder;
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

const { updateCrewListMessage } = require('./utils/crewListMessage');

client.once('clientReady', async () => {
  console.log(`✅ Football League Bot online! Logged in as ${client.user.tag}`);
  // Post/update the crew list message in the #crew-list channel on startup
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (guild) await updateCrewListMessage(guild).catch(console.error);
});


client.on('interactionCreate', async interaction => {
  // --- Autocomplete ---
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error('[AUTOCOMPLETE] Error:', err);
    }
    return;
  }

  // --- Slash commands ---
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('[COMMAND EXECUTE ERROR]', error);
      const { MessageFlags } = require('discord.js');
      const errMsg = error.message || 'There was an error while executing this command!';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed('Execution Error', errMsg)], flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed('Execution Error', errMsg)], flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
    return;
  }

  // --- Button: Revert Signing ---
  if (interaction.isButton() && interaction.customId.startsWith('revert_sign_')) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const parts = interaction.customId.split('_');
      // format: revert_sign_{playerId}_{teamId}_{signedById}_{timestamp}
      const playerId  = parts[2];
      const teamId    = parts[3];
      const timestamp = parts[5] ? parseInt(parts[5]) : null;

      // Check 5 minutes limit (300000ms)
      if (timestamp && Date.now() - timestamp > 300000) {
        // Disable the button since it expired
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('revert_expired')
            .setLabel('Revert Expired')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await interaction.message.edit({ components: [disabledRow] }).catch(() => {});
        return await interaction.editReply({ content: '❌ The 5-minute window to revert this signing has expired. You can no longer revert.' });
      }

      // Only the player who was signed can revert
      if (interaction.user.id !== playerId) {
        return await interaction.editReply({ content: '❌ Only the signed player can revert this signing.' });
      }

      const db = require('./database');
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      // Find the guild (bot must be in it)
      const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
      if (!guild) return await interaction.editReply({ content: '❌ Could not find the server.' });

      // Remove team role
      const team = db.getTeamById(parseInt(teamId));
      if (team) {
        const member = await guild.members.fetch(playerId).catch(() => null);
        const teamRole = team.roleId
          ? guild.roles.cache.get(team.roleId)
          : guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());

        if (member) {
          if (teamRole) {
            await member.roles.remove(teamRole.id).catch(console.error);
          }
          // Add Free Agent role
          const faRole = guild.roles.cache.find(r => 
            r.name.toLowerCase() === 'free agent' || 
            r.name.toLowerCase() === 'free agents' || 
            r.name.toLowerCase() === 'fa'
          );
          if (faRole) {
            await member.roles.add(faRole.id).catch(console.error);
          }
        }

        // Remove from DB
        db.removePlayerFromTeam(playerId);

        // Disable the button in DM
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('reverted')
            .setLabel('Signing Reverted')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await interaction.message.edit({ components: [disabledRow] }).catch(() => {});

        // Private confirmation to the player
        const revertedEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('Signing Reverted')
          .setDescription(`You have been removed from **${team.name}**. Your signing has been undone.`)
          .setTimestamp();
        await interaction.editReply({ embeds: [revertedEmbed] });

        // --- Post public revert notice to #transactions ---
        const displayName = member ? member.displayName : interaction.user.username;
        const displayLine = displayName !== interaction.user.username 
          ? `${displayName} (@${interaction.user.username})` 
          : interaction.user.username;

        const publicRevertEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ 
            name: 'ACW', 
            iconURL: guild.iconURL({ dynamic: true }) 
          })
          .setDescription(`📄 **${displayLine}** has been released from **${team.name}**.`)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'Transfer News' })
          .setTimestamp();

        const transactionsChannel = guild.channels.cache.find(
          c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
        );
        if (transactionsChannel) {
          await transactionsChannel.send({ embeds: [publicRevertEmbed] }).catch(console.error);
        }

        console.log(`[REVERT] ${interaction.user.username} reverted their signing from ${team.name}`);
      } else {
        await interaction.editReply({ content: '❌ Could not find that team in the database.' });
      }
    } catch (err) {
      console.error('[REVERT] Error:', err);
      await interaction.editReply({ content: `❌ Failed to revert: ${err.message}` });
    }
    return;
  }

  // --- Button: Grant/Deny Demand Release ---
  if (interaction.isButton() && (interaction.customId.startsWith('demand_grant_') || interaction.customId.startsWith('demand_deny_'))) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const isGrant = interaction.customId.startsWith('demand_grant_');
      const parts = interaction.customId.replace(isGrant ? 'demand_grant_' : 'demand_deny_', '').split('_');
      const targetUserId = parts[0];
      const teamId = parseInt(parts[1]);

      const team = db.getTeamById(teamId);
      const { isAdmin } = require('./utils/permissions');
      const crewList = require('./data/crewlist.json');

      // Validate permission: Franchise Owner / Crew Owner or Admin
      const member = interaction.member;
      const isOwnerRole = member && member.roles && member.roles.cache && member.roles.cache.some(r =>
        r.name.toLowerCase().includes('franchise') || r.name.toLowerCase().includes('owner')
      );
      const isCrewOwner = team && crewList.some(e => e.ownerId === member.id && e.team.toLowerCase() === team.name.toLowerCase());
      const userIsAdmin = isAdmin(member);

      if (!isOwnerRole && !isCrewOwner && !userIsAdmin) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'Only the Franchise Owner / Crew Owner of this team or an Admin can grant or deny release demands.')]
        });
      }

      if (isGrant) {
        // Remove from DB
        db.removePlayerFromTeam(targetUserId);

        // Remove team role & give Free Agent role in Discord
        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (targetMember && team) {
          const teamRole = team.roleId ? interaction.guild.roles.cache.get(team.roleId) : interaction.guild.roles.cache.find(r => r.name.toLowerCase() === team.name.toLowerCase());
          if (teamRole && targetMember.roles.cache.has(teamRole.id)) {
            await targetMember.roles.remove(teamRole.id).catch(console.error);
          }

          let faRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'free agent');
          if (faRole) {
            await targetMember.roles.add(faRole.id).catch(console.error);
          }
        }

        const { updateCrewListMessage } = require('./utils/crewListMessage');
        await updateCrewListMessage(interaction.guild).catch(console.error);

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#2ECC71')
          .setTitle('✅ Release Granted')
          .setFields([
            interaction.message.embeds[0].fields[0],
            interaction.message.embeds[0].fields[1],
            interaction.message.embeds[0].fields[2],
            { name: 'Status', value: `✅ Release Granted by <@${interaction.user.id}>`, inline: false }
          ]);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
        await interaction.editReply({ content: `✅ Successfully granted release demand for <@${targetUserId}>.` });
      } else {
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#ED4245')
          .setTitle('✖️ Release Denied')
          .setFields([
            interaction.message.embeds[0].fields[0],
            interaction.message.embeds[0].fields[1],
            interaction.message.embeds[0].fields[2],
            { name: 'Status', value: `✖️ Release Denied by <@${interaction.user.id}>`, inline: false }
          ]);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
        await interaction.editReply({ content: `✖️ Denied release demand for <@${targetUserId}>.` });
      }
    } catch (err) {
      console.error('[DEMAND BUTTON] Error:', err);
      await interaction.editReply({ content: `❌ Error processing demand: ${err.message}` });
    }
    return;
  }

  // --- Button: Open Ticket ---
  if (interaction.isButton() && interaction.customId.startsWith('ticket_open_')) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const type = interaction.customId.replace('ticket_open_', '');
      const user = interaction.user;
      const guild = interaction.guild;

      // Define prefixes and display titles
      const ticketTypes = {
        cc:       { prefix: 'cc',      title: 'Content Creator Application' },
        support:  { prefix: 'support', title: 'General Support' },
        bail:     { prefix: 'bail',    title: 'Bail Payment' },
        exploit:  { prefix: 'exploit', title: 'Exploit Report' },
        crew:     { prefix: 'crew',    title: 'Create a Crew' },
        oto:      { prefix: 'oto',     title: 'Request a OTO' }
      };

      const ticketInfo = ticketTypes[type] || { prefix: 'ticket', title: 'Support Ticket' };
      const channelName = `${ticketInfo.prefix}-${user.username}`.toLowerCase();

      // Find or create "Tickets" category
      let category = guild.channels.cache.find(
        c => c.name.toLowerCase() === 'tickets' && c.type === 4 // Category
      );
      if (!category) {
        category = await guild.channels.create({
          name: 'Tickets',
          type: 4 // Category
        }).catch(() => null);
      }

      // Check if user already has a ticket channel open of this type
      const exists = guild.channels.cache.find(
        c => c.name === channelName && c.parentId === (category ? category.id : null)
      );
      if (exists) {
        return await interaction.editReply({ content: `❌ You already have an open ticket of this type here: <#${exists.id}>` });
      }

      // Calculate permissions
      const { PermissionFlagsBits } = require('discord.js');
      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ]
        }
      ];

      // Add Admin permissions
      const config = require('./config.json');
      const adminRoles = [...(config.adminRoles || []), ...(config.superAdminRoles || [])];
      for (const roleId of adminRoles) {
        if (roleId && guild.roles.cache.has(roleId)) {
          permissionOverwrites.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }
      }

      // Create channel
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: 0, // GuildText
        parent: category ? category.id : null,
        permissionOverwrites
      });

      // Send greeting embed in new channel
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const embedColor = (type === 'bail' || type === 'oto') ? '#ED4245' : '#FEE75C';
      const ticketEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setDescription(
          'Thank you for contacting support.\n' +
          'Please describe your issue and wait for a response.'
        )
        .setFooter({ 
          text: 'Powered by Cylo', 
          iconURL: guild.iconURL({ dynamic: true }) 
        });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_close_reason')
          .setLabel('Close With Reason')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('Claim')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🙋‍♂️')
      );

      await ticketChannel.send({
        content: `Welcome <@${user.id}> | Staff notification`,
        embeds: [ticketEmbed],
        components: [closeRow]
      });

      // Save claim mapping (opener information)
      const { readStats, writeStats } = require('./utils/ticketStats');
      const stats = readStats();
      stats.claims[ticketChannel.id] = {
        openerId: user.id,
        claimerId: null
      };
      writeStats(stats);

      await interaction.editReply({ content: `✅ Ticket created successfully! Go to <#${ticketChannel.id}>` });

    } catch (err) {
      console.error('[TICKET OPEN] Error:', err);
      await interaction.editReply({ content: `❌ Failed to open ticket: ${err.message}` });
    }
    return;
  }

  // --- Button: Claim Ticket ---
  if (interaction.isButton() && interaction.customId === 'ticket_claim') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const member = interaction.member;
      const config = require('./config.json');
      const adminRoles = [...(config.adminRoles || []), ...(config.superAdminRoles || [])];
      
      const isStaff = member.permissions.has('Administrator') || 
                      member.roles.cache.some(r => {
                        const name = r.name.toLowerCase();
                        return adminRoles.includes(r.id) ||
                               name.includes('mod') || 
                               name.includes('staff') || 
                               name.includes('helper') || 
                               name.includes('admin') || 
                               name.includes('support');
                      });

      if (!isStaff) {
        return await interaction.editReply({ content: '❌ Only staff and moderators can claim tickets.' });
      }

      // Read claims stats to find the opener
      const { readStats, writeStats } = require('./utils/ticketStats');
      const stats = readStats();
      const claimEntry = stats.claims[interaction.channel.id];

      if (!claimEntry) {
        return await interaction.editReply({ content: '❌ Ticket claim info not found in database.' });
      }

      const openerId = claimEntry.openerId;
      claimEntry.claimerId = interaction.user.id;

      // Update staff stats
      if (!stats.stats[interaction.user.id]) {
        stats.stats[interaction.user.id] = { username: interaction.user.username, claimed: 0, closed: 0 };
      }
      stats.stats[interaction.user.id].claimed += 1;
      writeStats(stats);

      // Lock channel permissions: Only claimer, opener, and admins can view/type
      const { PermissionFlagsBits } = require('discord.js');
      const permissionOverwrites = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: openerId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
          ]
        }
      ];

      // Add Admins/Superadmins only
      const superAdminRoles = config.superAdminRoles || [];
      for (const roleId of superAdminRoles) {
        if (roleId) {
          permissionOverwrites.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }
      }

      // Apply overwrites
      await interaction.channel.permissionOverwrites.set(permissionOverwrites).catch(console.error);

      // Disable/update buttons: we will leave them so they can close the ticket later
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_close_reason')
          .setLabel('Close With Reason')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_claim_disabled')
          .setLabel('Claim')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🙋‍♂️')
          .setDisabled(true)
      );

      await interaction.message.edit({ components: [updatedRow] }).catch(console.error);

      // Create a green embed for the ticket claiming
      const channelName = interaction.channel.name;
      const isBailOrOto = channelName.startsWith('bail-') || channelName.startsWith('oto-');
      const claimEmbedColor = isBailOrOto ? '#ED4245' : '#FEE75C';

      const claimEmbed = new EmbedBuilder()
        .setColor(claimEmbedColor)
        .setTitle('Claimed Ticket')
        .setDescription(`Your ticket will be handled by <@${interaction.user.id}>`)
        .setFooter({
          text: 'Powered by Cylo',
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      // Post the claim embed in the channel
      await interaction.channel.send({ embeds: [claimEmbed] });

      await interaction.editReply({ content: '✅ Ticket claimed!' });
    } catch (err) {
      console.error('[TICKET CLAIM] Error:', err);
      await interaction.editReply({ content: `❌ Failed to claim ticket: ${err.message}` });
    }
    return;
  }

  // --- Button: Close Ticket ---
  if (interaction.isButton() && interaction.customId === 'ticket_close') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const channel = interaction.channel;

      // Award close/resolved point to claimer
      const { readStats, writeStats } = require('./utils/ticketStats');
      const stats = readStats();
      const claimEntry = stats.claims[channel.id];

      if (claimEntry && claimEntry.claimerId) {
        const claimerId = claimEntry.claimerId;
        if (!stats.stats[claimerId]) {
          stats.stats[claimerId] = { username: 'Unknown', claimed: 1, closed: 0 };
        }
        stats.stats[claimerId].closed += 1;
        
        // Clean up claim mapping
        delete stats.claims[channel.id];
        writeStats(stats);
      }

      // Close/delete the channel in 5 seconds
      await interaction.editReply({ content: '🔒 This ticket will be deleted in 5 seconds...' });
      setTimeout(async () => {
        await channel.delete('Ticket closed').catch(console.error);
      }, 5000);
    } catch (err) {
      console.error('[TICKET CLOSE] Error:', err);
      await interaction.editReply({ content: `❌ Failed to close ticket: ${err.message}` });
    }
    return;
  }

  // --- Button: Close With Reason ---
  if (interaction.isButton() && interaction.customId === 'ticket_close_reason') {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    
    // Create a modal
    const modal = new ModalBuilder()
      .setCustomId('ticket_close_modal')
      .setTitle('Close Ticket with Reason');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Reason for closing')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter the reason for closing this ticket...')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return;
  }

  // --- Modal Submit: Close with Reason ---
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_close_modal') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const reason = interaction.fields.getTextInputValue('close_reason');
      const channel = interaction.channel;

      // Award close/resolved point to claimer
      const { readStats, writeStats } = require('./utils/ticketStats');
      const stats = readStats();
      const claimEntry = stats.claims[channel.id];

      // Send close reason DM to the ticket opener if possible
      if (claimEntry) {
        const openerUser = await client.users.fetch(claimEntry.openerId).catch(() => null);
        if (openerUser) {
          const { EmbedBuilder } = require('discord.js');
          const dmEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🎫 Ticket Closed')
            .setDescription(`Your ticket in **${interaction.guild.name}** has been closed.`)
            .addFields(
              { name: 'Reason', value: reason || 'No reason provided' },
              { name: 'Closed By', value: `<@${interaction.user.id}>` }
            )
            .setTimestamp();
          await openerUser.send({ embeds: [dmEmbed] }).catch(() => {});
        }

        if (claimEntry.claimerId) {
          const claimerId = claimEntry.claimerId;
          if (!stats.stats[claimerId]) {
            stats.stats[claimerId] = { username: 'Unknown', claimed: 1, closed: 0 };
          }
          stats.stats[claimerId].closed += 1;
        }

        // Clean up claim mapping
        delete stats.claims[channel.id];
        writeStats(stats);
      }

      await interaction.editReply({ content: '🔒 Ticket reason recorded. This ticket will be deleted in 5 seconds...' });
      setTimeout(async () => {
        await channel.delete('Ticket closed with reason').catch(console.error);
      }, 5000);

    } catch (err) {
      console.error('[TICKET CLOSE MODAL] Error:', err);
      await interaction.editReply({ content: `❌ Failed to close ticket: ${err.message}` });
    }
    return;
  }

  // --- Modal Submit: Flag & Revert False Score ---
  if (interaction.isModalSubmit() && interaction.customId.startsWith('flag_score_modal_')) {
    try {
      const { MessageFlags } = require('discord.js');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const reason = interaction.fields.getTextInputValue('revert_reason');

      const parts = interaction.customId.split('_');
      // Format: flag_score_modal_{reporterTeamId}_{opponentTeamId}_{yourScore}_{theirScore}
      const repTeamId  = parseInt(parts[3]);
      const oppTeamId  = parseInt(parts[4]);
      const yourScore  = parseInt(parts[5]);
      const theirScore = parseInt(parts[6]);

      const db = require('./database');
      const repTeam = db.getTeamById(repTeamId);
      const oppTeam = db.getTeamById(oppTeamId);

      const repTeamName = repTeam ? repTeam.name : 'Unknown';
      const oppTeamName = oppTeam ? oppTeam.name : 'Unknown';

      // 1. Subtract the recorded stats from both teams
      const repWin  = yourScore > theirScore ? 1 : 0;
      const repLoss = yourScore < theirScore ? 1 : 0;
      const repTie  = yourScore === theirScore ? 1 : 0;

      const oppWin  = theirScore > yourScore ? 1 : 0;
      const oppLoss = theirScore < yourScore ? 1 : 0;
      const oppTie  = yourScore === theirScore ? 1 : 0;

      db.updateTeamRecord(repTeamId, {
        wins: -repWin,
        losses: -repLoss,
        ties: -repTie,
        pointsFor: -yourScore,
        pointsAgainst: -theirScore
      });

      db.updateTeamRecord(oppTeamId, {
        wins: -oppWin,
        losses: -oppLoss,
        ties: -oppTie,
        pointsFor: -theirScore,
        pointsAgainst: -yourScore
      });

      // 2. Delete the score message from the scores channel
      if (interaction.message) {
        await interaction.message.delete().catch(console.error);
      }

      // 3. Log the reversion in false-scores-logs channel
      const logsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('false-score') || c.name.includes('dispute') || c.name.includes('score-log'))
      );

      if (logsChannel) {
        const { EmbedBuilder } = require('discord.js');
        const repTeamMention = repTeam && repTeam.roleId ? `<@&${repTeam.roleId}>` : `**${repTeamName}**`;
        const oppTeamMention = oppTeam && oppTeam.roleId ? `<@&${oppTeam.roleId}>` : `**${oppTeamName}**`;

        const disputeEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTitle('↩️ Score Reverted')
          .setDescription(`A match score has been reverted by an Admin! The records have been subtracted from both teams.`)
          .addFields(
            { name: 'Reporter Team', value: `${repTeamMention} (-${yourScore} pts)`, inline: true },
            { name: 'Opponent Team', value: `${oppTeamMention} (-${theirScore} pts)`, inline: true },
            { name: 'Reverted By', value: `<@${interaction.user.id}> (@${interaction.user.username})`, inline: false },
            { name: 'Reason', value: reason, inline: false }
          )
          .setTimestamp();

        await logsChannel.send({
          content: `↩️ **False Score Reverted** | ${repTeamMention} vs ${oppTeamMention} | Record Subtracted`,
          embeds: [disputeEmbed]
        });
      }

      // 4. Update the Power Rankings message dynamically
      const { updatePowerRankingsMessage } = require('./utils/powerRankings');
      await updatePowerRankingsMessage(interaction.guild).catch(console.error);

      await interaction.editReply({ content: '✅ Successfully reverted this score, deleted the score post, and logged the action!' });

    } catch (err) {
      console.error('[REVERT SCORE MODAL] Error:', err);
      await interaction.editReply({ content: `❌ Failed to revert score: ${err.message}` });
    }
    return;
  }

  // --- StringSelectMenu: Top List Category Filter ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_top_list_category') {
    try {
      await interaction.deferUpdate();
      const category = interaction.values[0];
      const { buildTopListEmbed, buildTopListDropdown } = require('./utils/topListHelper');

      const embed = buildTopListEmbed(category, interaction.guild);
      const row = buildTopListDropdown(category);

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });
    } catch (err) {
      console.error('[TOP LIST SELECT] Error:', err);
    }
    return;
  }

  // --- Button: Flag/Revert False Score ---
  if (interaction.isButton() && interaction.customId.startsWith('flag_score_')) {
    try {
      const { isAdmin } = require('./utils/permissions');
      const { MessageFlags } = require('discord.js');
      if (!isAdmin(interaction.member)) {
        return await interaction.reply({ content: '❌ Only admins and higher ups can revert scores.', flags: MessageFlags.Ephemeral });
      }

      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const parts = interaction.customId.split('_');
      // Format: flag_score_{reporterTeamId}_{opponentTeamId}_{yourScore}_{theirScore}
      const repTeamId  = parts[2];
      const oppTeamId  = parts[3];
      const yourScore  = parts[4];
      const theirScore = parts[5];

      const modal = new ModalBuilder()
        .setCustomId(`flag_score_modal_${repTeamId}_${oppTeamId}_${yourScore}_${theirScore}`)
        .setTitle('Flag & Revert Score');

      const reasonInput = new TextInputBuilder()
        .setCustomId('revert_reason')
        .setLabel('Reason for Reverting')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter the reason for flagging this score as false...')
        .setRequired(true)
        .setMaxLength(500);

      const firstRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(firstRow);

      await interaction.showModal(modal);

    } catch (err) {
      console.error('[REVERT SCORE BUTTON] Error:', err);
    }
    return;
  }
});

// --- Event: roleDelete (Auto-remove team when role is deleted) ---
client.on('roleDelete', async role => {
  try {
    const db = require('./database');
    const teams = db.getTeams();
    const team = teams.find(t => t.roleId === role.id);
    
    if (team) {
      console.log(`[roleDelete] Team role "${role.name}" was deleted. Auto-removing from bot database...`);
      
      // Delete the team from database
      db.deleteTeam(team.name);

      // Clean up crewlist.json
      const CREWLIST_PATH = path.join(__dirname, 'data/crewlist.json');
      if (fs.existsSync(CREWLIST_PATH)) {
        let crewList = [];
        try { crewList = JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); } catch {}
        const updatedCrewList = crewList.filter(e => e.roleId !== role.id && e.team.toLowerCase() !== team.name.toLowerCase());
        fs.writeFileSync(CREWLIST_PATH, JSON.stringify(updatedCrewList, null, 2), 'utf8');
      }

      // Update crew list live message
      const { updateCrewListMessage } = require('./utils/crewListMessage');
      await updateCrewListMessage(role.guild).catch(console.error);

      // Update power rankings live message
      const { updatePowerRankingsMessage } = require('./utils/powerRankings');
      await updatePowerRankingsMessage(role.guild).catch(console.error);

      // Post notice to #transactions channel
      const transactionsChannel = role.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );

      if (transactionsChannel) {
        const { EmbedBuilder } = require('discord.js');
        const autoRemoveEmbed = new EmbedBuilder()
          .setColor('#E67E22')
          .setAuthor({ 
            name: 'ACW S1 | Regular Season', 
            iconURL: role.guild.iconURL({ dynamic: true }) 
          })
          .setTitle('Team Auto-Removed')
          .setDescription(`**${team.name}** was removed from the bot's records because its Discord role was deleted.`)
          .addFields(
            { name: 'Role ID', value: role.id }
          )
          .setTimestamp();

        await transactionsChannel.send({ embeds: [autoRemoveEmbed] }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('[roleDelete] Error:', err);
  }
});

// --- Event: guildMemberUpdate (Auto-update mod list when a user's roles change) ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const { readModListConfig, updateModListMessage } = require('./utils/modListMessage');
    const modListConfig = readModListConfig();
    if (modListConfig.length === 0) return;

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const roleIds = modListConfig.map(r => r.roleId);
    const hasModListRoleChange = roleIds.some(id => oldRoles.has(id) !== newRoles.has(id));

    if (hasModListRoleChange) {
      console.log(`[guildMemberUpdate] Mod list role change detected for ${newMember.user.tag}. Updating mod list...`);
      await updateModListMessage(newMember.guild);
    }
  } catch (err) {
    console.error('[guildMemberUpdate] Error:', err);
  }
});

function getBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN.trim().replace(/^["']|["']$/g, '');
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase().includes('token')) {
      const val = process.env[key];
      if (val && val.length > 20 && val !== 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        return val.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  const fallbackB64 = "TVRVeU9USTFNak16T0RBM016YzJOREF3TXcuR2k3T2VJLlkyMnUtT2hhQmE2UlZQMnp3VUFzczRuU3NadHBxT1BiS2w3dmFN";
  return Buffer.from(fallbackB64, 'base64').toString('utf8');
}

client.login(getBotToken()).catch(err => {
  console.error('[LOGIN ERROR] Failed to log in to Discord:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception] Error:', error);
});
