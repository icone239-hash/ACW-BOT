require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { execSync } = require('child_process');
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

const CREWLIST_PATH = path.join(__dirname, '../data/crewlist.json');
const INIT_CREWLIST_PATH = path.join(__dirname, '../data_init/crewlist.json');
const TEAMS_PATH = path.join(__dirname, '../data/teams.json');
const INIT_TEAMS_PATH = path.join(__dirname, '../data_init/teams.json');

// 1. Get original 43-team crewlist from git commit 79fc1a0
const originalCrewList = JSON.parse(execSync('git show 79fc1a0:data_init/crewlist.json').toString());

// Fix PJ Academy name if needed
originalCrewList.forEach(c => {
  if (c.team.includes('<@&') || c.roleId === '1531445225174863943') {
    c.team = 'PJ Academy';
    c.roleId = '1531445225174863943';
  }
});

// Save restored crewlist
fs.writeFileSync(CREWLIST_PATH, JSON.stringify(originalCrewList, null, 2), 'utf8');
fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(originalCrewList, null, 2), 'utf8');
console.log(`[RAID RESTORE] Restored ${originalCrewList.length} crews to crewlist.json and data_init/crewlist.json!`);

// 2. Get original teams.json from commit 79fc1a0
const originalTeams = JSON.parse(execSync('git show 79fc1a0:data_init/teams.json').toString());

originalTeams.forEach(t => {
  if (t.name.includes('<@&') || t.roleId === '1531445225174863943') {
    t.name = 'PJ Academy';
    t.roleId = '1531445225174863943';
  }
});

// Ensure explicit records: slant academy = 5W-1L, Aspen = 4W-0L, HAX = 10W-2L
const slant = originalTeams.find(t => t.name.toLowerCase().includes('slant'));
if (slant) { slant.wins = 5; slant.losses = 1; slant.pointsFor = 20; slant.pointsAgainst = 4; }

const aspen = originalTeams.find(t => t.name.toLowerCase() === 'aspen');
if (aspen) { aspen.wins = 4; aspen.losses = 0; aspen.pointsFor = 16; aspen.pointsAgainst = 0; }

const hax = originalTeams.find(t => t.name.toLowerCase() === 'hax');
if (hax) { hax.wins = 10; hax.losses = 2; hax.pointsFor = 40; hax.pointsAgainst = 8; }

fs.writeFileSync(TEAMS_PATH, JSON.stringify(originalTeams, null, 2), 'utf8');
fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(originalTeams, null, 2), 'utf8');
console.log(`[RAID RESTORE] Restored ${originalTeams.length} teams to teams.json and data_init/teams.json!`);

// 3. Connect to Discord, recreate missing roles if needed, and update embeds
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`[RAID RESTORE] Logged in as ${client.user.tag}`);
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  if (guild) {
    await guild.roles.fetch().catch(() => {});

    // Check if any restored crew has a deleted role on Discord, recreate if missing
    for (const c of originalCrewList) {
      let role = c.roleId ? guild.roles.cache.get(c.roleId) : null;
      if (!role && c.team) {
        role = guild.roles.cache.find(r => r.name.toLowerCase() === c.team.toLowerCase());
      }
      if (!role && c.team) {
        try {
          const newRole = await guild.roles.create({
            name: c.team,
            color: c.color || '#99AAB5',
            reason: 'Restoring team role after raid'
          });
          c.roleId = newRole.id;
          const dbTeam = originalTeams.find(t => t.name.toLowerCase() === c.team.toLowerCase());
          if (dbTeam) dbTeam.roleId = newRole.id;
          console.log(`[RAID RESTORE] Recreated missing role on Discord for team: "${c.team}" (ID: ${newRole.id})`);
        } catch (rErr) {
          console.error(`[RAID RESTORE] Error creating role for ${c.team}:`, rErr.message);
        }
      }
    }

    fs.writeFileSync(CREWLIST_PATH, JSON.stringify(originalCrewList, null, 2), 'utf8');
    fs.writeFileSync(INIT_CREWLIST_PATH, JSON.stringify(originalCrewList, null, 2), 'utf8');
    fs.writeFileSync(TEAMS_PATH, JSON.stringify(originalTeams, null, 2), 'utf8');
    fs.writeFileSync(INIT_TEAMS_PATH, JSON.stringify(originalTeams, null, 2), 'utf8');

    console.log('[RAID RESTORE] Refreshing #crew-list embed...');
    await updateCrewListMessage(guild).catch(console.error);

    console.log('[RAID RESTORE] Refreshing #power-rankings embed...');
    await updatePowerRankingsMessage(guild).catch(console.error);

    console.log('[RAID RESTORE] Successfully restored all teams and refreshed embeds!');
  }
  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
