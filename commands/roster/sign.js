const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getUserTeam } = require('../../utils/permissions');
const db = require('../../database');
const crewList = require('../../data/crewlist.json');

const MAX_ROSTER = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sign')
    .setDescription('Signs a player to your team')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('The player to sign')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('position')
        .setDescription('Player position (optional)')
        .setRequired(false)),

  async execute(interaction) {
    // Defer immediately so Discord doesn't timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const playerUser = interaction.options.getUser('player');
      const position = interaction.options.getString('position') || 'N/A';
      const member = interaction.member;

      const { areTransactionsOpen } = require('../../utils/transactionsHelper');
      if (!areTransactionsOpen()) {
        return await interaction.editReply({
          embeds: [errorEmbed('Transactions Closed', '🔒 Roster transactions are currently **CLOSED** (Playoffs). Signing players is disabled.')]
        });
      }

      // --- Find the user's team ---
      const userTeam = getUserTeam(member);

      if (!userTeam) {
        return await interaction.editReply({
          embeds: [errorEmbed('No Team Found', 'Could not detect your team. Make sure you have your team role assigned or are registered as Crew Owner on the crew list.')]
        });
      }

      // --- Validate: must have Franchise Owner role OR be owner on crew list OR be Admin ---
      const hasOwnerRole = member && member.roles && member.roles.cache && member.roles.cache.some(r =>
        r.name.toLowerCase().includes('franchise') || r.name.toLowerCase().includes('owner') || r.name.toLowerCase().includes('co-fo')
      );
      const isCrewOwner = crewList.some(e => e.ownerId === member.id);

      if (!hasOwnerRole && !isCrewOwner) {
        return await interaction.editReply({
          embeds: [errorEmbed('Not Authorized', 'You must have the **Franchise Owner** role or be registered as Crew Owner to sign players.')]
        });
      }

      const crewEntry = crewList.find(e => e.team.toLowerCase() === userTeam.name.toLowerCase());
      if (crewEntry) {
        // If we have their Discord ID, check it directly; otherwise trust the role
        const isCrewOwnerById = crewEntry.ownerId && interaction.user.id === crewEntry.ownerId;
        const noIdOnFile = !crewEntry.ownerId;
        if (!isCrewOwnerById && !noIdOnFile) {
          return await interaction.editReply({
            embeds: [errorEmbed('Not Authorized', `You are not listed as the franchise owner of **${userTeam.name}** in the crew list.`)]
          });
        }
      }


      // --- Block signing yourself ---
      if (playerUser.id === interaction.user.id) {
        return await interaction.editReply({
          embeds: [errorEmbed('Invalid', 'You cannot sign yourself!')]
        });
      }

      // --- Fetch the target member to check their actual Discord roles ---
      const targetMember = await interaction.guild.members.fetch(playerUser.id).catch(() => null);

      // --- Find team role ---
      let teamRole = userTeam.roleId ? interaction.guild.roles.cache.get(userTeam.roleId) : null;
      if (!teamRole) {
        teamRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === userTeam.name.toLowerCase());
      }

      // --- Check if player is ALREADY on ANY team (DB or Discord Role) ---
      const existingPlayerInDb = db.getPlayer(playerUser.id);
      if (existingPlayerInDb && existingPlayerInDb.teamId) {
        const currentTeam = db.getTeamById(existingPlayerInDb.teamId);
        const currentTeamName = currentTeam ? currentTeam.name : 'another team';
        return await interaction.editReply({
          embeds: [errorEmbed('Already Signed', `<@${playerUser.id}> is already signed to **${currentTeamName}**! A player cannot be signed to a new team while already on a roster.`)]
        });
      }

      if (targetMember) {
        const teams = db.getTeams();
        for (const t of teams) {
          const hasRole = (t.roleId && targetMember.roles.cache.has(t.roleId)) ||
                          targetMember.roles.cache.some(r => r.name.toLowerCase() === t.name.toLowerCase());
          if (hasRole) {
            return await interaction.editReply({
              embeds: [errorEmbed('Already Signed', `<@${playerUser.id}> is already on the roster of **${t.name}**! They must be released before signing with another team.`)]
            });
          }
        }
      }

      // --- Fetch guild members & calculate complete roster count BEFORE adding the new player ---
      await Promise.race([
        interaction.guild.members.fetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 2500))
      ]).catch(() => {});

      const dbPlayers = db.getTeamPlayers(userTeam.id);
      const teamMembers = teamRole ? teamRole.members : new Map();
      const foundCrew = crewEntry || crewList.find(e => e.team.toLowerCase() === userTeam.name.toLowerCase() || (userTeam.roleId && e.roleId === userTeam.roleId));

      const allPlayerIds = new Set(Array.from(teamMembers.keys()));
      for (const p of dbPlayers) {
        if (p.discordId) allPlayerIds.add(p.discordId);
      }
      if (foundCrew?.ownerId) allPlayerIds.add(foundCrew.ownerId);

      if (allPlayerIds.size >= MAX_ROSTER) {
        return await interaction.editReply({
          embeds: [errorEmbed('Roster Full', `🔒 Your roster is currently full (**${allPlayerIds.size}/${MAX_ROSTER}**). Team owners cannot sign more than 10 players. Release a player first.`)]
        });
      }

      // --- Sign the player in DB ---
      console.log(`[SIGN] Signing ${playerUser.username} (${playerUser.id}) to ${userTeam.name} (${userTeam.id})`);
      db.addPlayer({
        discordId: playerUser.id,
        username: playerUser.username,
        teamId: userTeam.id,
        position
      });

      // --- Assign team role and remove Free Agent role ---
      if (targetMember) {
        if (teamRole) {
          await targetMember.roles.add(teamRole.id).catch(e =>
            console.error(`[SIGN] Role assign failed: ${e.message}`)
          );
          console.log(`[SIGN] Gave role "${teamRole.name}" to ${playerUser.username}`);
        }
        // Remove Free Agent role
        const faRole = interaction.guild.roles.cache.find(r => 
          r.name.toLowerCase() === 'free agent' || 
          r.name.toLowerCase() === 'free agents' || 
          r.name.toLowerCase() === 'fa'
        );
        if (faRole && targetMember.roles.cache.has(faRole.id)) {
          await targetMember.roles.remove(faRole.id).catch(e =>
            console.error(`[SIGN] Failed to remove Free Agent role: ${e.message}`)
          );
          console.log(`[SIGN] Removed Free Agent role from ${playerUser.username}`);
        }
      } else {
        console.warn(`[SIGN] Could not assign roles — member: ${!!targetMember}`);
      }

      const newRosterCount = rosterBefore + 1;
      const roleMention = teamRole ? `<@&${teamRole.id}>` : `**${userTeam.name}**`;

      // --- DM the signed player ---
      const dmEmbed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle("You've Been Signed!")
        .setDescription(
          `You have been signed to **${userTeam.name}** in **${interaction.guild.name}**.`
        )
        .addFields(
          { name: 'Signed By', value: `${interaction.user.username} (@${interaction.user.username})` }
        )
        .setFooter({ text: `If this was done without your permission, click the button below to revert.` })
        .setTimestamp();

      const revertButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`revert_sign_${playerUser.id}_${userTeam.id}_${interaction.user.id}_${Date.now()}`)
          .setLabel('Revert Signing')
          .setStyle(ButtonStyle.Danger)
      );

      await playerUser.send({ embeds: [dmEmbed], components: [revertButton] }).catch(e => {
        console.warn(`[SIGN] Could not DM ${playerUser.username}: ${e.message}`);
      });

      // --- Build public transaction embed ---
      const publicEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle('Player Signed')
        .setDescription(`<@${playerUser.id}> has been signed to ${roleMention}`)
        .addFields(
          { name: 'Signed By', value: `<@${interaction.user.id}>`, inline: false },
          { name: 'Roster', value: `${newRosterCount}/${MAX_ROSTER}`, inline: false }
        )
        .setImage(playerUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setTimestamp();

      // --- Confirm to the command user (private) ---
      await interaction.editReply({
        embeds: [successEmbed('Player Signed', `Successfully signed <@${playerUser.id}> to **${userTeam.name}**! Roster: ${newRosterCount}/${MAX_ROSTER}`)]
      });

      // --- Post to #transactions channel (public) ---
      const transactionsChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('transaction') || c.name.includes('transactions'))
      );
      if (transactionsChannel) {
        await transactionsChannel.send({ embeds: [publicEmbed] }).catch(console.error);
      }

    } catch (error) {
      console.error('[SIGN] Unhandled error:', error);
      await interaction.editReply({
        embeds: [errorEmbed('Error', `Something went wrong: ${error.message}`)]
      }).catch(console.error);
    }
  }
};
