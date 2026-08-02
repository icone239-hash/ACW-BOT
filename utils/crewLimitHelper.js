// utils/crewLimitHelper.js
const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');
const INIT_SETTINGS_PATH = path.join(__dirname, '../data_init/settings.json');
const CONFIG_PATH = path.join(__dirname, '../config.json');

function getMaxCrews() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      if (typeof data.maxCrews === 'number') return data.maxCrews;
    }
    if (fs.existsSync(INIT_SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(INIT_SETTINGS_PATH, 'utf8'));
      if (typeof data.maxCrews === 'number') return data.maxCrews;
    }
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (typeof data.maxCrews === 'number') return data.maxCrews;
    }
  } catch (err) {
    console.error('[crewLimitHelper] Error reading maxCrews:', err);
  }
  return 40; // Default limit
}

function setMaxCrews(limit) {
  const newLimit = parseInt(limit, 10);
  if (isNaN(newLimit) || newLimit < 1) return false;

  try {
    const dataDir = path.join(__dirname, '../data');
    const initDir = path.join(__dirname, '../data_init');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(initDir)) fs.mkdirSync(initDir, { recursive: true });

    // Update settings.json in data and data_init
    let settings = {};
    if (fs.existsSync(SETTINGS_PATH)) {
      try { settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); } catch {}
    }
    settings.maxCrews = newLimit;
    settings.updatedAt = new Date().toISOString();

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    fs.writeFileSync(INIT_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');

    // Update config.json if exists
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        config.maxCrews = newLimit;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
      } catch {}
    }

    console.log(`[crewLimitHelper] Set maxCrews permanently to ${newLimit}`);
    return true;
  } catch (err) {
    console.error('[crewLimitHelper] Error saving maxCrews:', err);
    return false;
  }
}

module.exports = { getMaxCrews, setMaxCrews };
