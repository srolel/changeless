import imm from 'immutable';
import simm from 'seamless-immutable';
import {set, merge, fns} from '../src/index';
import now from 'performance-now';
import _ from 'lodash';
// import memwatch from 'memwatch-next';

if (typeof performance === 'undefined') {
    var performance = {
        now: require('performance-now')
    };
}

// memwatch.on('leak', (info) => {
//     console.log('info', info);
// });

// memwatch.on('stats', (stats) => {
//     console.log('stats', stats);
// });

// import _ from 'lodash';
if (!global.regeneratorRuntime)
require('babel-polyfill');
    _.forEach(fns, (val, key) => {
        fns[key] = function() {
            const now = performance.now();
            const ret = val.apply(null, arguments);
            fns[key].meta.calls++;
            fns[key].meta.time += performance.now() - now;
            return ret;
        };
        fns[key].meta = {calls: 0, time: 0};
        fns[key].restore = () => fns[key] = val;

    });

const delay = ms => new Promise((resolve) => setTimeout(resolve, ms))

let x = 0;
const time = async function(fn, desc = `test ${x++}`, numTests = 10) {
    let t = 0;
    for (let i = 0; i < numTests; i++) {
;        await delay(i * 0.1);
        const now = performance.now()
        fn()
;        t += (performance.now() - now) / numTests;
    }
    t = t.toFixed(7);
    console.log(desc + ':', t + 'ms');
    return t;
};



// let mock = {};
// for (let i = 0; i < 100; i++) {
//     mock[`wat${i}`] = {a: i};
// }

// let imock = imm.fromJS(mock);

// let result1 = time(() => imock.setIn(['wat40', 'a'], 1000), 'object:immutablejs');
// let result2 = time(() => set(mock, ['wat40', 'a'], 1000), 'object:native');
// console.log('object:immutable/native:', (100 * result1 / result2).toFixed(3) + '%');
// let mock = [];
// let obj = {};
// for (let i = 0; i < 1000; i++) {
//     obj['x' + i] = i;
// }
// for (let i = 0; i < 2000; i++) {
//     mock[i] = obj;
// }
// console.time('immutablejs fromJS')
// let imock = imm.fromJS(mock);
// console.timeEnd('immutablejs fromJS')
async function bench() {

    const target = {a: {x: {y: 0}, b: {c: {d: 2}}}};

        const source = {c: {d: 3}};
        const immTarget = imm.fromJS(target);
        const immSource = imm.fromJS(source);
        let result1 = await time(() => merge(target, 'a.b', source), 'array:native');
        let result2 = await time(() => immTarget.mergeDeepIn('a.b', immSource), 'array:immutablejs');
// let result1 = await time(() => imock.setIn([20, 'x10'], 100), 'array:immutablejs');
// let result2 = await time(() => (set(mock, [20, 'x10'], 100)), 'array:native');

// let result3 = time(() => simock.merge({y20: {x10: 100}}, {deep: true}), 'array:seamless-immutable');
console.log('array:immutable/native:', (100 * result2 / result1).toFixed(3) + '%');


}

async function run() {
    try {
        await bench();
    } catch(e) {
        console.error(e.stack);
    }


    _.forEach(fns, (val, key) => {
        const {time, calls} = fns[key].meta;
        const avgTime = time / calls;
        if (avgTime) console.log(key, avgTime, calls);
        fns[key].restore();
    });
}
// console.log('array:seamless/native:', (100 * result3 / result2).toFixed(3) + '%');

run();


