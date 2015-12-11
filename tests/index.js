import {expect, default as chai} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as imm from '../src/index';
import {time} from './utils';
import _ from 'lodash';
chai.use(sinonChai);

const {set, merge, withMutations} = imm;

beforeEach(() =>
    _.forEach(imm.clone, (val, key) =>
        _.isFunction(val) && sinon.spy(imm.clone, key)));

afterEach(() =>
    _.forEach(imm.clone, (val) =>
        _.isFunction(val) && val.restore()));

describe('set', () => {
    it('should return a different object reference', () => {
        const obj = {a: 1};
        const newObj = set(obj, 'a', 2);
        expect(newObj).to.not.equal(obj);
        expect(newObj.a).to.equal(2);
        expect(imm.clone.object).to.have.been.calledOnce;
    });

    it('should work with arrays', () => {
        const arr = [1];
        const newArr = set(arr, '0', 2);
        expect(newArr).to.not.equal(arr);
        expect(newArr[0]).to.equal(2);
        expect(imm.clone.array).to.have.been.calledOnce;
    });

    it('should work with array path', () => {
        const obj = {a: {b: 1}};
        const newObj = set(obj, 'a.b', 2);
        expect(newObj).to.not.equal(obj);
        expect(newObj.a).to.not.equal(obj.a);
        expect(newObj.a.b).to.equal(2);
        expect(imm.clone.object).to.have.been.calledTwice;
    });

    it('should work with nested object/array', () => {
        const arr = [{a: 2}, {b: 3}];
        const newArr = set(arr, '0.a', 2);
        expect(newArr).to.not.equal(arr);
        expect(newArr).to.eql(arr);
        expect(newArr[0]).to.not.equal(arr[0]);
        expect(newArr[1]).to.equal(arr[1]);
        expect(newArr[1].b).to.equal(arr[1].b);
        expect(newArr[0].a).to.equal(2);
        expect(imm.clone.array).to.have.been.calledOnce;
        expect(imm.clone.object).to.have.been.calledOnce;
    });

});

describe('withMutations', () => {

    it('should apply multiple mutations', () => {
        const obj = {a: 1, b: 2, c: 3};
        const newObj = withMutations(obj, o => {
            set(set(o, 'a', 2), 'b', 1);
        });

        expect(newObj).to.eql({a: 2, b: 1, c: 3});
        expect(imm.clone.object).to.have.been.calledOnce;
    });

    it('should apply multiple deep mutations', () => {
        const obj = [{a: 1, b: [1,2], c: 3}, {a: 4, d: 5}];
        const newObj = withMutations(obj, o => {
            set(set(o, '0.a', 2), '1.d', 0);
        });

        expect(newObj).to.eql([{a: 2, b: [1,2], c: 3}, {a: 4, d: 0}])
        expect(imm.clone.object).to.have.been.calledTwice;
        expect(imm.clone.array).to.have.been.calledOnce;
        expect(newObj[0]).to.not.equal(obj[0]);
        expect(newObj[0].b).to.equal(obj[0].b);
    });

});

describe('merge', () => {

});
