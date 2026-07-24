// commands/roster/view.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
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
    .setName('roster')
    .setDescription('Shows the full roster of a team')
    .addRoleOption(option =>
      option.setName('team')
        .setDescription('Select the team role to view roster (optional)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const selectedRole = interaction.options.getRole('team');
      const crewList = readCrewList();
      const dbTeams = db.getTeams();

      let teamRole = selectedRole;
      let teamName = selectedRole ? selectedRole.name : null;

      // Auto-detect user's team if no role option was selected
      if (!teamRole) {
        const userMember = interaction.member;
        if (userMember && userMember.roles) {
          const crewEntry = crewList.find(e => e.ownerId === interaction.user.id);
          if (crewEntry && crewEntry.roleId) {
            teamRole = interaction.guild.roles.cache.get(crewEntry.roleId);
            teamName = crewEntry.team;
          }

          if (!teamRole) {
            for (const entry of crewList) {
              if (entry.roleId && userMember.roles.cache.has(entry.roleId)) {
                teamRole = interaction.guild.roles.cache.get(entry.roleId);
                teamName = entry.team;
                break;
              }
            }
          }

          if (!teamRole) {
            for (const t of dbTeams) {
              if (t.roleId && userMember.roles.cache.has(t.roleId)) {
                teamRole = interaction.guild.roles.cache.get(t.roleId);
                teamName = t.name;
                break;
              }
            }
          }
        }
      }

      if (!teamRole) {
        return await interaction.editReply({
          embeds: [errorEmbed('Team Required', 'Please select a team role option or ensure you have your team role assigned.')]
        });
      }

      teamName = teamRole.name;

      // Fetch all guild members to ensure our role members cache is fully populated (with a 2.5-second timeout to prevent hanging)
      await Promise.race([
        interaction.guild.members.fetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 2500))
      ]).catch(err => {
        console.warn(`[ROSTER VIEW] Failed to fetch guild members:`, err.message);
      });
      const teamMembers = teamRole.members;

      const dbTeam = dbTeams.find(t => t.name.toLowerCase() === teamName.toLowerCase() || t.roleId === teamRole.id);
      const dbPlayers = dbTeam ? db.getTeamPlayers(dbTeam.id) : [];
      const crewEntry = crewList.find(e => e.roleId === teamRole.id || e.team.toLowerCase() === teamName.toLowerCase());

      // Combine member cache with db players
      const allPlayerIds = new Set(Array.from(teamMembers.keys()));
      for (const p of dbPlayers) {
        if (p.discordId) allPlayerIds.add(p.discordId);
      }
      if (crewEntry?.ownerId) allPlayerIds.add(crewEntry.ownerId);

      const memberMap = new Map();
      for (const memberId of allPlayerIds) {
        const m = interaction.guild.members.cache.get(memberId);
        if (m) {
          memberMap.set(memberId, m);
        }
      }

      // Categorize staff members
      const owners = [];
      const gms = [];
      const hcs = [];
      const acs = [];
      const playerList = [];

      for (const memberId of allPlayerIds) {
        const m = memberMap.get(memberId);
        const dbPlayer = dbPlayers.find(p => p.discordId === memberId);
        const dbPosition = dbPlayer?.position || '';
        const username = m ? m.user.username : (dbPlayer?.username || 'Unknown');

        let isStaff = false;

        // Check Discord roles + DB position
        const roleNames = m ? m.roles.cache.map(r => r.name.toLowerCase()) : [];
        
        const isOwner = (crewEntry && crewEntry.ownerId === memberId) ||
                        dbPosition.toLowerCase() === 'owner' ||
                        dbPosition.toLowerCase() === 'franchise owner' ||
                        dbPosition.toLowerCase() === 'crew owner' ||
                        roleNames.some(n => n.includes('franchise owner') || n.includes('crew owner') || n === 'fo' || n === 'co-fo' || (n.includes('owner') && !n.includes('server') && !n.includes('bot')));
        if (isOwner) {
          if (!owners.some(o => o.id === memberId)) {
            owners.push(m || { id: memberId, username });
          }
          isStaff = true;
        }

        const isGM = dbPosition.toLowerCase() === 'general manager' ||
                     roleNames.some(n => n.includes('general manager') || n === 'gm' || n === 'co-gm');
        if (isGM) {
          if (!gms.some(g => g.id === memberId)) {
            gms.push(m || { id: memberId, username });
          }
          isStaff = true;
        }

        const isHC = dbPosition.toLowerCase() === 'head coach' ||
                     roleNames.some(n => n.includes('head coach') || n === 'hc' || n === 'co-hc');
        if (isHC) {
          if (!hcs.some(h => h.id === memberId)) {
            hcs.push(m || { id: memberId, username });
          }
          isStaff = true;
        }

        const isAC = dbPosition.toLowerCase() === 'assistant coach' ||
                     roleNames.some(n => n.includes('assistant coach') || n === 'ac' || n.includes('assistant'));
        if (isAC) {
          if (!acs.some(a => a.id === memberId)) {
            acs.push(m || { id: memberId, username });
          }
          isStaff = true;
        }

        if (!isStaff) {
          playerList.push({ id: memberId, username });
        }
      }

      const countDisplay = `${allPlayerIds.size}/10`;

      let desc = '';
      desc += `📊 **Roster Count**\n${countDisplay}\n\n`;

      desc += `👑 **Franchise Owner(s)**\n`;
      desc += owners.length > 0 
        ? owners.map(m => `• <@${m.id}> \`${m.user?.username || m.username}\``).join('\n') 
        : '• *None*';
      desc += '\n\n';

      desc += `👔 **General Manager(s)**\n`;
      desc += gms.length > 0 
        ? gms.map(m => `• <@${m.id}> \`${m.user?.username || m.username}\``).join('\n') 
        : '• *None*';
      desc += '\n\n';

      desc += `🧠 **Head Coach(es)**\n`;
      desc += hcs.length > 0 
        ? hcs.map(m => `• <@${m.id}> \`${m.user?.username || m.username}\``).join('\n') 
        : '• *None*';
      desc += '\n\n';

      desc += `📋 **Assistant Coach(es)**\n`;
      desc += acs.length > 0 
        ? acs.map(m => `• <@${m.id}> \`${m.user?.username || m.username}\``).join('\n') 
        : '• *None*';
      desc += '\n\n';

      desc += `──────── Players ────────\n\n`;

      desc += `🤾 **Players**\n`;
      if (playerList.length > 0) {
        desc += playerList.map(p => `• <@${p.id}> \`${p.username}\``).join('\n');
      } else {
        desc += '• *No players on roster*';
      }

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ 
          name: 'ACW S1 | Regular Season', 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle(`💕 ${teamName} Roster`)
        .setDescription(desc)
        .setFooter({ text: 'Roster for ACW S1 | Regular Season', iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[ROSTER VIEW] Error:', error);
      await interaction.editReply({ 
        embeds: [errorEmbed('Error', `Failed to fetch roster: ${error.message}`)]
      }).catch(console.error);
    }
  }
};
