const fs = require('fs');
const path = require('path');

const STATS_PATH = path.join(__dirname, '../data/ticket_stats.json');

function readStats() {
  try {
    if (!fs.existsSync(STATS_PATH)) {
      const initial = { claims: {}, stats: {} };
      fs.writeFileSync(STATS_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
  } catch (err) {
    console.error('[STATS] Error reading stats:', err);
    return { claims: {}, stats: {} };
  }
}

function writeStats(data) {
  try {
    fs.writeFileSync(STATS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[STATS] Error writing stats:', err);
  }
}

module.exports = { readStats, writeStats };
