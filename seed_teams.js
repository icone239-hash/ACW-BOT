// Seed all 68 PW Teams into database and associate Discord role IDs from target server
const fs = require('fs');
const db = require('./database');
const config = require('./config.json');
const https = require('https');

const rawTeams = [
  "LIE", "Seaside", "Uprising", "Gravity", "Climate", "Divine", "Savior",
  "Hebrew racing", "Tylenol", "Perish", "Crucible", "Patient", "Tsunami",
  "Global Dimes", "Rivals", "HATE", "NIRVANA", "Binary", "Legacy", "Remorse",
  "Veteran", "Pastime", "fog", "Prophecy", "CAUGHFIN", "Empire", "Ascension",
  "Arcane", "Ritual", "Vertigo", "HRV", "Havoc", "Walkmen", "Aiko", "Eminent",
  "Infinity", "Rose", "District", "Faith", "Rome", "Saintly", "Wraith",
  "summit", "Justice", "Olympus", "SML", "RI$EN", "taiko", "Vitality",
  "Cherish", "Bloom", "Lůsh", "Apex", "Rainfall", "Øway", "Life", "Fatal",
  "Kenkai", "Relm", "Sinned", "Reject", "Spain", "Ark", "Ruby", "M12",
  "Glare", "Oasis", "eclipse"
];

function apiRequest(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v9${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bot ${config.token}`,
        'User-Agent': 'DiscordBot (https://discord.js.org, 14.15.3)'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: [] }); }
      });
    });
    req.on('error', () => resolve({ status: 0, data: [] }));
    req.end();
  });
}

async function seedTeams() {
  console.log('🏈 Seeding all 68 PW teams into database...');

  // Fetch target server roles to link role IDs
  const rolesRes = await apiRequest(`/guilds/${config.guildId}/roles`);
  const guildRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];

  console.log(`Found ${guildRoles.length} roles in target server.`);

  let createdCount = 0;
  for (const teamName of rawTeams) {
    const matchingRole = guildRoles.find(r => r.name.toLowerCase() === teamName.toLowerCase());
    const roleId = matchingRole ? matchingRole.id : '';

    const existing = db.getTeam(teamName);
    if (!existing) {
      db.createTeam({
        name: teamName,
        abbreviation: teamName.substring(0, 4).toUpperCase(),
        logo: '',
        roleId: roleId
      });
      createdCount++;
      console.log(`  ✅ Added team: ${teamName} ${roleId ? `(Role ID: ${roleId})` : '(No matching role found)'}`);
    } else if (roleId && !existing.roleId) {
      existing.roleId = roleId;
      console.log(`  🔄 Updated role ID for: ${teamName}`);
    }
  }

  console.log(`\n🎉 SEEDING COMPLETE! Added ${createdCount} teams into database.`);
}

seedTeams().catch(console.error);
