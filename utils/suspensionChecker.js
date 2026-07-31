// utils/suspensionChecker.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const SUSPENSIONS_PATH = path.join(__dirname, '../data/suspensions.json');
const INIT_SUSPENSIONS_PATH = path.join(__dirname, '../data_init/suspensions.json');

function parseDurationMs(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const str = durationStr.toLowerCase().trim();

  if (str.includes('permanent') || str.includes('season') || str.includes('ban')) {
    return null; // Never auto-expire
  }

  // Match days: e.g. "7 days", "14 days", "3 days", "1 day", "7daysbail:: 10"
  const dayMatch = str.match(/(\d+)\s*day/);
  if (dayMatch) {
    return parseInt(dayMatch[1], 10) * 24 * 60 * 60 * 1000;
  }

  // Match hours: e.g. "24 hours", "12 hours"
  const hourMatch = str.match(/(\d+)\s*hour/);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60 * 60 * 1000;
  }

  return null;
}

function isSuspensionExpired(s) {
  if (s.expired) return true;
  if (!s.createdAt) return false;

  const durationMs = parseDurationMs(s.duration);
  if (!durationMs) return false;

  const createdTime = new Date(s.createdAt).getTime();
  if (isNaN(createdTime)) return false;

  const expiryTime = createdTime + durationMs;
  return Date.now() >= expiryTime;
}

async function checkExpiredSuspensions(client) {
  if (!client || !client.isReady()) return;

  try {
    if (!fs.existsSync(SUSPENSIONS_PATH)) return;

    const suspensions = JSON.parse(fs.readFileSync(SUSPENSIONS_PATH, 'utf8'));
    if (!Array.isArray(suspensions) || suspensions.length === 0) return;

    const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
    if (!guild) return;

    await guild.roles.fetch().catch(() => {});
    const suspendedRole = guild.roles.cache.find(r => 
      r.name.toLowerCase() === 'suspended' || 
      r.name.toLowerCase() === 'suspension' ||
      r.name.toLowerCase() === 'suspend'
    );

    const faRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'free agent' || r.name.toLowerCase() === 'fa');

    let updated = false;

    for (const s of suspensions) {
      if (s.expired) continue;

      if (isSuspensionExpired(s)) {
        s.expired = true;
        s.expiredAt = new Date().toISOString();
        updated = true;

        console.log(`[SUSPENSION EXPIRED] User ${s.username} (${s.userId}) - Reason: ${s.reason}, Duration: ${s.duration}`);

        // Check if user has any remaining active unexpired suspensions
        const remainingActive = suspensions.filter(x => x.userId === s.userId && !isSuspensionExpired(x));

        if (remainingActive.length === 0 && suspendedRole) {
          const member = await guild.members.fetch(s.userId).catch(() => null);
          if (member) {
            if (member.roles.cache.has(suspendedRole.id)) {
              await member.roles.remove(suspendedRole.id).catch(err => console.error(`[SUSPENSION REMOVE ROLE ERROR] ${s.username}:`, err.message));
              console.log(`[SUSPENSION ROLE REMOVED] Removed Suspended role from ${member.user.tag}`);
            }

            // Assign FA role if user is free agent
            if (faRole) {
              const hasTeamRole = member.roles.cache.some(r => r.name.toLowerCase().includes('crew') || r.name.toLowerCase().includes('team'));
              if (!hasTeamRole && !member.roles.cache.has(faRole.id)) {
                await member.roles.add(faRole.id).catch(() => {});
              }
            }
          }

          // Post expiration notice in suspensions channel
          const channel = guild.channels.cache.get(config.channels?.suspensions) ||
                          guild.channels.cache.get('1526012668752953414') ||
                          guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('suspension') || c.name.includes('suspensions')));

          if (channel) {
            const embed = new EmbedBuilder()
              .setColor('#57F287')
              .setAuthor({ name: 'ACW S1 | Suspensions', iconURL: guild.iconURL({ dynamic: true }) })
              .setTitle('🔓 Suspension Expired')
              .setDescription(`<@${s.userId}>'s suspension for **${s.reason}** (${s.duration}) has expired!\n\nThe **Suspended** role has been automatically removed.`)
              .setTimestamp();

            await channel.send({ embeds: [embed] }).catch(console.error);
          }
        }
      }
    }

    if (updated) {
      fs.writeFileSync(SUSPENSIONS_PATH, JSON.stringify(suspensions, null, 2), 'utf8');
      if (fs.existsSync(path.dirname(INIT_SUSPENSIONS_PATH))) {
        fs.writeFileSync(INIT_SUSPENSIONS_PATH, JSON.stringify(suspensions, null, 2), 'utf8');
      }
    }

  } catch (err) {
    console.error('[SUSPENSION CHECKER] Error checking expired suspensions:', err);
  }
}

module.exports = { checkExpiredSuspensions, isSuspensionExpired };
