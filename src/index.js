const isFunction = value => typeof value === 'function';
const isUndefined = value => value === undefined;
const isUndefinedOrNull = value => value == undefined;
const isString = value => typeof value === 'string';
const {isArray} = Array;
const isObject = val => val && typeof val === 'object';

export const maybeExecute = (maybeFn, arg) => isFunction(maybeFn) ? maybeFn(arg) : maybeFn;

const cacheKey = '__changeless__cache__';
const clonerKey = '__changeless__cloner__';

const createCloner = obj => {
  const keys = Object.keys(obj);
  var objDef = '{';
  for (var i = 0, len = keys.length; i < len; i++) {
     const key = keys[i];
     objDef += `'${key}': obj['${key}'],`;
  }
  objDef += '}';
  const cloner = Function('obj', 'return ' + objDef);
  addPropertyTo(obj, clonerKey, cloner);
  return cloner;
}

const addPropertyTo = (target, methodName, value) =>
    Object.defineProperty(target, methodName, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: value
    });

// exported as object to be spyable in tests
export const clone = {
    array(arr) {
        const len = arr.length;
        const ret = new Array(len);
        for (let i = 0; i < len; i++) {
            ret[i] = arr[i];
        }
        return ret;
    },

    /*
    * leverage prototype chain. todo: see if this prevents garbage collection and if so,
    * figure out how to solve it because this is a huge performance boost.
    */
    // object: Object.create,

    /*
    * simplest. also, slow as shit.
    */
    //  object(obj) {
    //     const ret = {};
    //     const keys = Object.keys(obj);
    //     for (let i = 0, len = keys.length; i < len; i++) {
    //         const key = keys[i];
    //         ret[key] = obj[key];
    //     }
    //     return ret;
    // }

    object(obj) {
        let cloner = obj[clonerKey];
        if (!cloner) {
            cloner = createCloner(obj);
        }
        const clone = cloner(obj);
        addPropertyTo(clone, clonerKey, cloner);
        return clone;
    }
};

export const cloneShallow = value => isArray(value) ? clone.array(value) : clone.object(value);

export const stageMutations = obj => {
    addPropertyTo(obj, cacheKey, {});
    return obj;
};

export const applyMutations = obj => {
    const cache = obj[cacheKey];
    obj[cacheKey] = null;
    const clone = cloneShallow(obj);
    const keys = Object.keys(cache);
    for (let i = 0, len = keys.length; i < len; i++) {
        const p = keys[i];
        const cur = cache[p];
        cur[p] = cloneShallow(cur[p]);
    }
    return clone;
};

export const withMutations = (obj, fn) => {
    stageMutations(obj);
    fn(obj);
    return applyMutations(obj);
};

/*
* not in use currently
*/
const get = (obj, path) => {
    for (let i = 0, len = path.len; i < len; i++) {
            if (isUndefinedOrNull(obj)) {
                return;
            }
            obj = obj[path[i]];
    }
    return obj;
}

/* 
* note that objects will be updated even if the
* value to update is the same as the current value in path
*/
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
        // or create a new level if it doesn't exist or it it's not an object
        if (isUndefined(c) || !isObject(c)) {
            cur[p] = {};
        } else {
            if (cache) {
                cache[p] = cur;
            } else {
                cur[p] = cloneShallow(c);
            }
        }

        // move deeper
        cur = cur[p];
    }

    const last = path[len - 1];
    if (cur[clonerKey] && !cur.hasOwnProperty(last)) {
        cur[clonerKey] = null;
    }
    cur[last] = maybeExecute(fn, cur[last]);

    return cloned;
};

export const set = update;

const traverse = (obj, cb, context = '') => {
    const keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        context = context ? context + '.' : '';
        const path = context + key;
        const val = obj[key];
        if (isObject(val)) {
            traverse(val, cb, path);
            cb(val, path, true);
        } else {
            cb(val, path);
        }
    }
};

export const freeze = obj => {

    Object.freeze(obj);

    traverse(obj, (val, path, isObject) =>
        isObject && Object.freeze(path));

    return obj;
};

export const merge = function() {

    const cache = {};

    const traverser = (val, path) => {
        if (!cache[path]) {
            cache[path] = val;
        }
    };

    for (let i = arguments.length - 1; i > 0; i--) {
        traverse(arguments[i], traverser);
    }

    return withMutations(arguments[0], obj => {
        const keys = Object.keys(obj);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            set(obj, key, cache[key]);
        }
    });
};

export default {update, set, withMutations, merge};
