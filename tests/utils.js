exports.time = (fn, numTests = 100) => {
    let t = 0;
    for (let i = 0; i < numTests; i++) {
        const now = performance.now();
        fn();
        t += (performance.now() - now) / numTests;
    }
    return t;
};
