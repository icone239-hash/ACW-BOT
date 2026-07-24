// utils/modListMessage.js
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config.json');
const MODLIST_CONFIG_PATH = path.join(__dirname, '../data/modlist_config.json');
const MODLIST_MSG_REF_PATH = path.join(__dirname, '../data/modlist_msg.json');

function readModListConfig() {
  try {
    if (!fs.existsSync(MODLIST_CONFIG_PATH)) return [];
    return JSON.parse(fs.readFileSync(MODLIST_CONFIG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeModListConfig(data) {
  fs.writeFileSync(MODLIST_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readMsgRef() {
  try {
    if (!fs.existsSync(MODLIST_MSG_REF_PATH)) return {};
    return JSON.parse(fs.readFileSync(MODLIST_MSG_REF_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeMsgRef(data) {
  fs.writeFileSync(MODLIST_MSG_REF_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function updateModListMessage(guild) {
  if (!guild) return;
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const channelId = config.channels?.modList || '';
    const channel = guild.channels.cache.get(channelId) || 
                    guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('mod-list') || c.name.includes('modlist')));

    if (!channel) {
      console.warn('[ModList] No mod-list channel found.');
      return;
    }

    const modListConfig = readModListConfig();
    if (modListConfig.length === 0) {
      console.warn('[ModList] No roles configured for the mod list.');
      return;
    }

    // Populate members cache to ensure accurate counts
    await guild.members.fetch().catch(err => {
      console.error('[ModList] Failed to fetch guild members:', err.message);
    });

    let lines = [];
    lines.push('🛡️ **MOD LIST** 🛡️\n');

    for (const roleConf of modListConfig) {
      const role = guild.roles.cache.get(roleConf.roleId);
      if (!role) continue;

      const members = role.members;
      lines.push(`<@&${role.id}> \`${members.size}/${roleConf.limit}\``);

      if (members.size > 0) {
        members.forEach(m => {
          lines.push(`<@${m.id}>`);
        });
      } else {
        lines.push('*None*');
      }
      lines.push(''); // Blank line spacing between groups
    }

    lines.push('@here\n');
    lines.push('**MADE BY** <@1186781918415569009>');
    
    // Format date in MM/DD/YY
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).substring(2);
    lines.push(`**UPDATED ${mm}/${dd}/${yy}**`);

    const messageContent = lines.join('\n');
    const ref = readMsgRef();

    let message = null;
    if (ref.channelId === channel.id && ref.messageId) {
      message = await channel.messages.fetch(ref.messageId).catch(() => null);
    }

    let edited = false;
    if (message) {
      try {
        await message.edit({ content: messageContent });
        console.log('[ModList] Updated existing Mod List message.');
        edited = true;
      } catch (editErr) {
        console.warn('[ModList] Failed to edit existing message, sending new one:', editErr.message);
        await message.delete().catch(() => null);
      }
    }

    if (!edited) {
      const newMsg = await channel.send({ content: messageContent });
      await newMsg.react('✅').catch(console.error);
      writeMsgRef({ channelId: channel.id, messageId: newMsg.id });
      console.log('[ModList] Posted new Mod List message.');
    }

  } catch (err) {
    console.error('[ModList] Error updating message:', err);
  }
}

module.exports = {
  readModListConfig,
  writeModListConfig,
  updateModListMessage
};
