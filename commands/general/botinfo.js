const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bot-info')
    .setDescription('Shows bot information'),
  async execute(interaction) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;
    const seconds = Math.floor(uptime) % 60;
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Bot Information')
      .addFields(
        { name: 'Version', value: '1.0.0', inline: true },
        { name: 'Server Count', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'League', value: 'Football League', inline: true },
        { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s` }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
