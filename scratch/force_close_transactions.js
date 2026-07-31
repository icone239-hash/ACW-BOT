const { setTransactionsOpen, areTransactionsOpen } = require('../utils/transactionsHelper');

setTransactionsOpen(false);
console.log('[SETTINGS] Set transactionsOpen to false. Current state:', areTransactionsOpen());
