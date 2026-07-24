// commands/general/resetoffenses.js
const { SlashCommandBuilder } = require('discord.js');
const suspensionModule = require('./suspension');

const PRESET_CHOICES = [
  { name: 'Possession Of Exploits', value: 'Possession Of Exploits' },
  { name: 'Exploiting', value: 'Exploiting' },
  { name: 'Ducking ss', value: 'Ducking ss' },
  { name: 'Admin abuse', value: 'Admin abuse' },
  { name: 'Doxxing photos that aren’t public', value: 'Doxxing photos that aren’t public' },
  { name: 'Other / Custom', value: 'Other / Custom' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetoffenses')
    .setDescription('Reset suspension offenses for a player')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('Select the player to reset offenses for')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Select specific reason to reset (optional - resets all if omitted)')
        .setRequired(false)
        .addChoices(...PRESET_CHOICES)),

  async execute(interaction) {
    interaction.options.getSubcommand = () => 'resetoffenses';
    await suspensionModule.execute(interaction);
  }
};
