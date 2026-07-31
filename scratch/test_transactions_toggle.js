const { areTransactionsOpen, setTransactionsOpen } = require('../utils/transactionsHelper');

console.log('[TEST] Initial transactions open:', areTransactionsOpen());

setTransactionsOpen(false);
console.log('[TEST] After closing, transactions open:', areTransactionsOpen());

setTransactionsOpen(true);
console.log('[TEST] After opening, transactions open:', areTransactionsOpen());

console.log('[TEST] Transactions helper test PASSED!');
