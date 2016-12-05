const chai = require('chai');
const {expect} = chai;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const {default: imm, fns} = require('../src/index');
const { time } = require('./utils');
const _ = require('lodash');
const now = require('performance-now');
const seamlessImmutable = require('seamless-immutable');
chai.use(sinonChai);
const {set, merge, withMutations} = imm;

compare = (fn1, fn2) => {
    const t1 = time(fn1, 20);
    const t2 = time(fn2, 20);
    console.log('----------------');
    console.log('fn1:', t1);
    console.log('fn2:', t2);
    console.log (t1 < t2);
    console.log('----------------');
    return t1 < t2;
    // expect(t1).to.be.lessThan(t2);
};

const rand = (min, max) => min + Math.ceil(Math.random() * max);

// generate a wildly random object
const gen = (arg) => {
    let getNum;
    if (typeof arg === 'number') {
        getNum = () => arg;
    } else {
        getNum = () => rand(arg.min, arg.max);
    }
    const getObj = () => Math.random() > 0.5 ? {} : [];
    let obj = {};
    for (let j = 0; j < getNum(); j++) {
        obj[j] = getObj();
        for (let i = 0; i < getNum(); i++) {
            obj[j][i] = getObj();
            for (let k = 0; k < getNum(); k++) {
                const x = obj[j][i][k] = getObj();
                x[getNum()] = getNum();
            }
        }
    }
    return obj;
};

describe('merge', function() {
    this.timeout(50000);
    it('should be faster', () => {
        let fails = 0, it = 10;
        for (let i = 1; i < it; i++) {
            const n = i;
            const obj1 = gen({min: i, max: i + 5});
            const obj2 = gen({min: i, max: i + 5});
            fails += compare(
                () => merge(obj1, obj2),
                () => seamlessImmutable(obj1).merge(obj2, { deep: true })
            ) ? 0 : 1;
        }

        expect(fails).to.be.lessThan(Math.ceil(it * 0.2));
    })
});

describe('fns', () => {

    beforeEach(() =>
        _.forEach(fns, (val, key) => {
            fns[key] = function () {
                const nowTime = now();
                const ret = val.apply(null, arguments);
                fns[key].meta.calls++;
                fns[key].meta.time += now() - nowTime;
                return ret;
            };
            fns[key].meta = { calls: 0, time: 0 };
            fns[key].restore = () => fns[key] = val;

        }));

    afterEach(() => {
        _.forEach(fns, (val, key) => {
            const avgTime = fns[key].meta.time / fns[key].meta.calls;
            if (avgTime) console.log(key, avgTime)
            fns[key].restore();
        });
    });

    describe('traverse', () => {
        
        it('should traverse an object', () => {

            const n = 4;

            const obj = gen(n);
            let calls = 0;
            fns.traverse(obj, (val, key, path, obj, isObj) => {
                calls++;
            });
            expect(calls).equal(n + n * n + 2 * n * n * n);

        });
    });
});

