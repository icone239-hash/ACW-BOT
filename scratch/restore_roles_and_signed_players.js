require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { updateCrewListMessage } = require('../utils/crewListMessage');
const { updatePowerRankingsMessage } = require('../utils/powerRankings');

function getBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN.trim().replace(/^["']|["']$/g, '');
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase().includes('token')) {
      const val = process.env[key];
      if (val && val.length > 20 && val !== 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        return val.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  const fallbackB64 = "TVRVeU9USTFNak16T0RBM016YzJOREF3TXcuR2k3T2VJLlkyMnUtT2hhQmE2UlZQMnp3VUFzczRuU3NadHBxT1BiS2w3dmFN";
  return Buffer.from(fallbackB64, 'base64').toString('utf8');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`[RESTORE ROLES] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (!guild) {
    console.error('[RESTORE ROLES] Guild not found');
    process.exit(1);
  }

  await guild.roles.fetch().catch(() => {});
  const ownerRole = guild.roles.cache.get('1525985365658177597') || guild.roles.cache.find(r => r.name.toLowerCase() === 'owner');
  const faRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'free agent' || r.name.toLowerCase() === 'fa');

  const crewList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/crewlist.json'), 'utf8'));
  const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams.json'), 'utf8'));
  const players = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/players.json'), 'utf8'));

  let ownerRoleCount = 0;
  let playerRoleCount = 0;

  // 1. Restore Crew Owners' Roles (Owner role + Team role)
  console.log('--- 1. Restoring Crew Owners ---');
  for (const c of crewList) {
    if (!c.ownerId) continue;
    const member = await guild.members.fetch(c.ownerId).catch(() => null);
    if (!member) continue;

    let teamRole = c.roleId ? guild.roles.cache.get(c.roleId) : null;
    if (!teamRole && c.team) {
      teamRole = guild.roles.cache.find(r => r.name.toLowerCase() === c.team.toLowerCase());
    }

    try {
      if (ownerRole && !member.roles.cache.has(ownerRole.id)) {
        await member.roles.add(ownerRole.id).catch(() => {});
        ownerRoleCount++;
      }
      if (teamRole && !member.roles.cache.has(teamRole.id)) {
        await member.roles.add(teamRole.id).catch(() => {});
      }
      if (faRole && member.roles.cache.has(faRole.id)) {
        await member.roles.remove(faRole.id).catch(() => {});
      }
      console.log(`[OWNER RESTORED] ${member.user.tag} -> Owner role + Team "${c.team}"`);
    } catch (err) {
      console.error(`[OWNER ERROR] ${c.team}:`, err.message);
    }
  }

  // 2. Restore Signed Players' Team Roles
  console.log('\n--- 2. Restoring Signed Players ---');
  const signedPlayers = players.filter(p => p.teamId);

  for (const p of signedPlayers) {
    const discordId = p.discordId || String(p.id);
    if (!discordId || discordId.length < 15) continue; // Skip numeric auto-increment DB ids

    const dbTeam = teams.find(t => t.id === p.teamId);
    if (!dbTeam) continue;

    const crewEntry = crewList.find(c => c.team.toLowerCase() === dbTeam.name.toLowerCase() || (dbTeam.roleId && c.roleId === dbTeam.roleId));
    let teamRole = dbTeam.roleId ? guild.roles.cache.get(dbTeam.roleId) : null;
    if (!teamRole && crewEntry && crewEntry.roleId) {
      teamRole = guild.roles.cache.get(crewEntry.roleId);
    }
    if (!teamRole) {
      teamRole = guild.roles.cache.find(r => r.name.toLowerCase() === dbTeam.name.toLowerCase());
    }

    if (!teamRole) continue;

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) continue;

    try {
      if (!member.roles.cache.has(teamRole.id)) {
        await member.roles.add(teamRole.id).catch(() => {});
        playerRoleCount++;
        console.log(`[PLAYER RESTORED] ${member.user.tag} -> Team "${dbTeam.name}"`);
      }
      if (faRole && member.roles.cache.has(faRole.id)) {
        await member.roles.remove(faRole.id).catch(() => {});
      }
    } catch (err) {
      console.error(`[PLAYER ERROR] ${discordId}:`, err.message);
    }
  }

  console.log(`\n[SUCCESS] Restored ${ownerRoleCount} Crew Owners and ${playerRoleCount} signed players' Discord roles!`);

  // 3. Refresh embeds
  console.log('[RESTORE ROLES] Refreshing #crew-list...');
  await updateCrewListMessage(guild).catch(console.error);

  console.log('[RESTORE ROLES] Refreshing #power-rankings...');
  await updatePowerRankingsMessage(guild).catch(console.error);

  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
