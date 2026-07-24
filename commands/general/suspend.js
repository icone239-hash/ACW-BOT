// commands/general/suspend.js
const { SlashCommandBuilder } = require('discord.js');
const suspensionModule = require('./suspension');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suspend')
    .setDescription('Suspend a player from the league')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('Select the player to suspend')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Select reason from dropdown menu')
        .setRequired(true)
        .addChoices(
          { name: 'Possession Of Exploits', value: 'Possession Of Exploits' },
          { name: 'Exploiting', value: 'Exploiting' },
          { name: 'Ducking ss', value: 'Ducking ss' },
          { name: 'Admin abuse', value: 'Admin abuse' },
          { name: 'Doxxing photos that aren’t public', value: 'Doxxing photos that aren’t public' },
          { name: 'Other / Custom', value: 'Other / Custom' }
        ))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Override duration (optional - auto-calculated from rules)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('bail')
        .setDescription('Override bail amount (optional - auto-calculated from rules)')
        .setRequired(false)),

  async execute(interaction) {
    // Forward directly to sub=suspend handler in suspension.js
    interaction.options.getSubcommand = () => 'suspend';
    await suspensionModule.execute(interaction);
  }
};
