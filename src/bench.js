import imm from 'immutable';
import simm from 'seamless-immutable';
import {set} from './index';

let x = 0;
const time = (fn, desc = `test ${x++}`, numTests = 100) => {
    let t = 0;
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

let mock = {};
let obj = {};
for (let i = 0; i < 100; i++) {
    obj['x' + i] = i;
}
for (let i = 0; i < 100; i++) {
    mock['y' + i] = obj;
}
let imock;
let simock;
time(() => imock = imm.fromJS(mock), 'immutablejs creation', 10);
time(() => simock = simm(mock), 'seamless creation', 10);
let result1 = time(() => imock.setIn(['y20', 'x10'], 100), 'array:immutablejs');
let result2 = time(() => set(mock, ['y20', 'x10'], 100), 'array:native');
let result3 = time(() => simock.merge({y20: {x10: 100}}, {deep: true}), 'array:seamless-immutable');
console.log('array:immutable/native:', (100 * result1 / result2).toFixed(3) + '%');
console.log('array:seamless/native:', (100 * result3 / result2).toFixed(3) + '%');

