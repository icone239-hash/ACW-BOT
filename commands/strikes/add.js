const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const db = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Adds a strike to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the strike')
        .setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Permission Denied', 'You must be an admin to use this command.')], ephemeral: true });
    }
    
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    try {
      db.addStrike({ discordId: user.id, username: user.username, reason, issuedBy: interaction.user.id });
      
      const userStrikes = db.getUserStrikes(user.id);
      const total = userStrikes ? userStrikes.length : 1;

      let warning = '';
      if (total >= 3) {
        warning = '\n\n**WARNING**: This user has reached 3 strikes!';
        const config = JSON.parse(fs.readFileSync('../../config.json', 'utf8'));
        if (config.strikeRoles && config.strikeRoles.length > 0) {
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          if (member) {
            await member.roles.remove(config.strikeRoles).catch(console.error);
            warning += '\nStrike roles have been removed from the user.';
          }
        }
      }

      await interaction.reply({ embeds: [successEmbed('Strike Added', `<@${user.id}> has been given a strike for: ${reason}\nTotal strikes: ${total}${warning}`)] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to add strike.')], ephemeral: true });
    }
  }
};
