import imm from 'immutable';
import {set} from './index';

let x = 0;
const time = (fn, desc = `test ${x++}`) => {
    let t = 0;
    const numTests = 10000;
    for (let i = 0; i < numTests; i++) {
        const now = performance.now();
        fn();
        t += (performance.now() - now) / numTests;
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

let mock = [];
for (let i = 0; i < 1000; i++) {
    mock[i] = {a: i};
}

let imock = imm.fromJS(mock);

let result1 = time(() => imock.setIn([40, 'a'], 1000), 'array:immutablejs');
let result2 = time(() => set(mock, [40, 'a'], 1000), 'array:native');
console.log('arrayimmutable/native:', (100 * result1 / result2).toFixed(3) + '%');

