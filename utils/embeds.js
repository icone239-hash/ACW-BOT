const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const COLOR = config.leagueColor || '#00FF7F';
const LEAGUE = config.leagueName || 'ACW Park Wars League';

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function errorEmbed(titleOrDescription, description) {
  const title = description ? titleOrDescription : 'Error';
  const desc  = description ? description : titleOrDescription;
  return new EmbedBuilder()
    .setColor('#FF4444')
    .setTitle(`❌ ${title}`)
    .setDescription(desc)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`🏈 ${title}`)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: LEAGUE });
}

function warningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#FFA500')
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

module.exports = { successEmbed, errorEmbed, infoEmbed, warningEmbed };
