const isFunction = value => typeof value === 'function';
const isUndefined = value => value === undefined;
const isString = value => typeof value === 'string';
const {isArray} = Array;

const maybeExecute = (maybeFn, arg) => isFunction(maybeFn) ? maybeFn(arg) : maybeFn;

const cloneArrayShallow = arr => {
    const len = arr.length;
    const ret = new Array(len);
    for (let i = 0; i < len; i++) {
        ret[i] = len[i];
    }
    return ret;
};

const cloneObjectShallow = obj => {
    const ret = {};
    // no hasOwnProperty on purpose, for performance
    for (let key in obj) {
        ret[key] = obj[key];
    }
    return ret;
};

const cloneShallow = value => isArray(value) ? cloneArrayShallow(value) : cloneObjectShallow(value);

const cacheKey = '__cache__';

export const withMutations = (obj, fn) => {
    const cache = {};
    obj[cacheKey] = cache;
    const cloned = cloneShallow(fn(obj));
    const len = cache.length;

    for (let p in cache) {
        const cur = cache[p];
        cur[p] = cloneShallow(cur[p]);
    }

    delete obj[cacheKey];

    return cloned;
};

export const update = (obj, path, fn) => {
 
    path = isString(path) ? path.split('.') : path;
    
    const cache = obj[cacheKey];

    let cloned = obj;
    if (!cache) {
        cloned = cloneShallow(obj);
    }
 
    let cur = cloned;
    const len = path.length;
    for (let i = 0; i < len - 1; i++) {
        const p = path[i];
        const c = cur[p];

        // create a copy of the current level 
        // or create a new level if it doesn't exist
        if (isUndefined(c)) {
            cur[p] = {};
        }

        if (cache) {
            cache[p] = cur;
        } else {
            cur[p] = cloneShallow(c);
        }

        cur[p] = isUndefined(c) ? {} : cloneShallow(c);

        // move deeper
        cur = cur[p];
    }

    const last = path[len - 1];
    cur[last] = maybeExecute(fn, cur[last]);

    return cloned;
};

export const set = update;

export default {update, set, withMutations};

