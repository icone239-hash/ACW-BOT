const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('command-help')
    .setDescription('Shows all commands for a category')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Category of commands')
        .setRequired(true)
        .addChoices(
          { name: 'Team', value: 'team' },
          { name: 'Roster', value: 'roster' },
          { name: 'Game', value: 'game' },
          { name: 'Standings', value: 'standings' },
          { name: 'Stats', value: 'stats' },
          { name: 'Strikes', value: 'strikes' },
          { name: 'Config', value: 'config' },
          { name: 'General', value: 'general' }
        )),
  async execute(interaction) {
    const category = interaction.options.getString('category');
    const commands = interaction.client.commands.filter(cmd => cmd.category === category);
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`Help: ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`);

    if (commands.size === 0) {
      embed.setDescription('No commands found in this category.');
    } else {
      let desc = '';
      commands.forEach(cmd => {
        desc += `**/${cmd.data.name}**\n${cmd.data.description}\n\n`;
      });
      embed.setDescription(desc);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
