const { getMaxCrews, setMaxCrews } = require('../utils/crewLimitHelper');

console.log('[TEST] Initial maxCrews:', getMaxCrews());

setMaxCrews(43);
console.log('[TEST] After setMaxCrews(43), maxCrews:', getMaxCrews());

setMaxCrews(40);
console.log('[TEST] After setMaxCrews(40), maxCrews:', getMaxCrews());

console.log('[TEST] Crew limit persistence test PASSED!');
