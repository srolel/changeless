const now = require('performance-now');
exports.time = (fn, numTests = 100) => {
    let t = 0;
    for (let i = 0; i < numTests; i++) {
        const n = now();
        fn();
        t += (now() - n) / numTests;
    }
    return t;
};
