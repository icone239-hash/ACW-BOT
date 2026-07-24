const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChannelType } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets-setup')
    .setDescription('Set up a ticket panel in the current channel')
    .addStringOption(option =>
      option.setName('panel_type')
        .setDescription('Select the type of ticket panel to create')
        .setRequired(true)
        .addChoices(
          { name: 'Open a Ticket (CC, Support, Bail)', value: 'general' },
          { name: 'Bail Tickets', value: 'bail' },
          { name: 'Exploit Reports', value: 'exploit' },
          { name: 'Create a Crew', value: 'crew' },
          { name: 'Request a OTO', value: 'oto' }
        )
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const panelType = interaction.options.getString('panel_type');
    const channel = interaction.channel;

    try {
      let targetChannel = channel;

      if (panelType === 'bail') {
        const found = interaction.guild.channels.cache.find(
          c => c.isTextBased() && (c.name.includes('bail') || c.name.includes('💵'))
        );
        if (found) {
          targetChannel = found;
        } else {
          targetChannel = await interaction.guild.channels.create({
            name: '💵・bail',
            type: ChannelType.GuildText,
            parent: channel.parent ? channel.parent.id : null,
            topic: 'To pay your bail use the Create ticket button'
          });
        }
      }


      if (panelType === 'general') {
        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTitle('🎫 Open a Ticket')
          .setDescription(
            'Select the type of ticket you\'d like to open:\n\n' +
            '**Apply for Content Creator**\n' +
            '**General Support**\n' +
            '**Bail Payment**'
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_open_cc')
            .setLabel('Apply for Content Creator')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫'),
          new ButtonBuilder()
            .setCustomId('ticket_open_support')
            .setLabel('General Support')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫'),
          new ButtonBuilder()
            .setCustomId('ticket_open_bail')
            .setLabel('Bail Payment')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
      }

      if (panelType === 'bail') {
        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('Pay Your Bail')
          .setDescription('To create a ticket use the Create ticket button')
          .setFooter({
            text: 'Powered by Cylo',
            iconURL: interaction.guild.iconURL({ dynamic: true })
          });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_open_bail')
            .setLabel('Create ticket')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📩')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
      }

      if (panelType === 'oto') {
        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('🎫 Request a OTO')
          .setDescription('Click the button below to open a ticket.')
          .setFooter({
            text: 'Powered by Cylo',
            iconURL: interaction.guild.iconURL({ dynamic: true })
          });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_open_oto')
            .setLabel('Request a OTO')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
      }

      if (panelType === 'exploit') {
        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTitle('🎫 Exploit Reports')
          .setDescription('Click the button below to open a ticket.')
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_open_exploit')
            .setLabel('Exploit Reports')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
      }

      if (panelType === 'crew') {
        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'ACW S1 | Regular Season', iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTitle('🎫 Create a Crew')
          .setDescription('Click the button below to open a ticket.')
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_open_crew')
            .setLabel('Create a Crew')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
      }

      await interaction.editReply({ content: `✅ Ticket panel successfully posted in <#${targetChannel.id}>!` });

    } catch (err) {
      console.error('[TICKETS SETUP] Error:', err);
      await interaction.editReply({ embeds: [errorEmbed('Error', `Failed to set up panel: ${err.message}`)] });
    }
  }
};
