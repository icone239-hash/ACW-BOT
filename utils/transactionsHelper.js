const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');
const INIT_SETTINGS_PATH = path.join(__dirname, '../data_init/settings.json');

function areTransactionsOpen() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      if (typeof data.transactionsOpen === 'boolean') return data.transactionsOpen;
    }
    if (fs.existsSync(INIT_SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(INIT_SETTINGS_PATH, 'utf8'));
      if (typeof data.transactionsOpen === 'boolean') return data.transactionsOpen;
    }
  } catch (err) {
    console.error('[transactionsHelper] Error reading settings:', err);
  }
  return true; // Default open if not explicitly closed
}

function setTransactionsOpen(isOpen) {
  const data = { transactionsOpen: !!isOpen, updatedAt: new Date().toISOString() };
  try {
    const dataDir = path.join(__dirname, '../data');
    const initDir = path.join(__dirname, '../data_init');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(initDir)) fs.mkdirSync(initDir, { recursive: true });

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync(INIT_SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[transactionsHelper] Set transactionsOpen to ${isOpen}`);
    return true;
  } catch (err) {
    console.error('[transactionsHelper] Error saving settings:', err);
    return false;
  }
}

module.exports = { areTransactionsOpen, setTransactionsOpen };
