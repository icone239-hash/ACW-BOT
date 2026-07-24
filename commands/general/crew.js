const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { updateCrewListMessage } = require('../../utils/crewListMessage');
const fs   = require('fs');
const path = require('path');

const CREWLIST_PATH = path.join(__dirname, '../../data/crewlist.json');

function readCrewList()   { try { return JSON.parse(fs.readFileSync(CREWLIST_PATH, 'utf8')); } catch { return []; } }
function writeCrewList(d) { fs.writeFileSync(CREWLIST_PATH, JSON.stringify(d, null, 2), 'utf8'); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crew')
    .setDescription('Crew list management')

    // /crew add
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a team to the crew list')
        .addRoleOption(opt =>
          opt.setName('team_role')
            .setDescription('The team role to add')
            .setRequired(true))
        .addUserOption(opt =>
          opt.setName('owner')
            .setDescription('The franchise owner')
            .setRequired(true))
    )

    // /crew remove
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a team from the crew list')
        .addRoleOption(opt =>
          opt.setName('team_role')
            .setDescription('The team role to remove')
            .setRequired(true))
    )

    // /crew clear
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('⚠️ Clear the entire crew list')
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!interaction.guild) {
      return interaction.reply({
        embeds: [errorEmbed('Error', 'This command can only be used within a Discord server.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    // =====================
    // /crew add
    // =====================
    if (sub === 'add') {
      try {
        const teamRole  = interaction.options.getRole('team_role');
        const ownerUser = interaction.options.getUser('owner');
        const teamName  = teamRole.name;

        const crewList = readCrewList();
        const idx = crewList.findIndex(e => e.team.toLowerCase() === teamName.toLowerCase());
        const entry = {
          team:     teamName,
          roleId:   teamRole.id,
          ownerTag: `<@${ownerUser.id}>`,
          ownerId:  ownerUser.id
        };

        if (idx >= 0) {
          crewList[idx] = entry; // update existing entry
        } else {
          crewList.push(entry);  // add new entry
        }
        writeCrewList(crewList);

        // Edit the live crew list message
        await updateCrewListMessage(interaction.guild);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF7F')
              .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
              .setTitle('✅ Added to Crew List')
              .addFields(
                { name: 'Team',  value: `<@&${teamRole.id}>`,  inline: true },
                { name: 'Owner', value: `<@${ownerUser.id}>`, inline: true }
              )
              .setTimestamp()
          ]
        });

      } catch (err) {
        console.error('[CREW ADD]', err);
        await interaction.editReply({ embeds: [errorEmbed('Error', err.message)] });
      }
    }

    // =====================
    // /crew remove
    // =====================
    if (sub === 'remove') {
      try {
        const teamRole = interaction.options.getRole('team_role');
        const crewList = readCrewList();
        const before   = crewList.length;
        const filtered = crewList.filter(e => e.team.toLowerCase() !== teamRole.name.toLowerCase());

        if (filtered.length === before) {
          return await interaction.editReply({
            embeds: [errorEmbed('Not Found', `**${teamRole.name}** is not in the crew list.`)]
          });
        }

        writeCrewList(filtered);
        await updateCrewListMessage(interaction.guild);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setTitle('🗑️ Removed from Crew List')
              .setDescription(`**${teamRole.name}** has been removed from the crew list.`)
              .setTimestamp()
          ]
        });

      } catch (err) {
        console.error('[CREW REMOVE]', err);
        await interaction.editReply({ embeds: [errorEmbed('Error', err.message)] });
      }
    }

    // =====================
    // /crew clear
    // =====================
    if (sub === 'clear') {
      try {
        const count = readCrewList().length;
        writeCrewList([]);
        await updateCrewListMessage(interaction.guild);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
              .setTitle('🗑️ Crew List Cleared')
              .setDescription(`Removed **${count}** team${count !== 1 ? 's' : ''} from the crew list.`)
              .setTimestamp()
          ]
        });

      } catch (err) {
        console.error('[CREW CLEAR]', err);
        await interaction.editReply({ embeds: [errorEmbed('Error', err.message)] });
      }
    }
  }
};
