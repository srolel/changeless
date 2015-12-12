const isFunction = value => typeof value === 'function';
const isUndefined = value => value === undefined;
const isUndefinedOrNull = value => value == undefined;
const isString = value => typeof value === 'string';
const {isArray} = Array;
const isObject = value => value && typeof value === 'object';
const sliceArguments = function() {
    Array.prototype.slice.apply.apply(null, arguments);
};
const maybeExecute = (maybeFn, arg) =>
    isFunction(maybeFn) ? maybeFn(arg) : maybeFn;

const cacheKey = '__changeless__cache__';

const clonerKey = '__changeless__cloner__';

const addPropertyTo = (target, methodName, value) => Object.defineProperty(
    target, methodName, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: value
    });

// exporting for tests
export const fns = {

    // generates a structured clone function for a given object
    createCloner(obj) {
        const keys = Object.keys(obj);
        var objDef = '{';
        for (var i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            objDef += `'${key}': obj['${key}'],`;
        }
        objDef += '}';
        return Function('obj', 'return ' + objDef);
    },

    // clones object using the generated cloner.
    // saves that cloner as a property the object and clone
    cloneObject(obj) {
        let cloner = obj[clonerKey];
        if (!cloner) {
            cloner = fns.createCloner(obj);
            addPropertyTo(obj, clonerKey, cloner);
        }
        const clone = cloner(obj);
        addPropertyTo(clone, clonerKey, cloner);
        return clone;
    },

    cloneArray(arr) {
        const len = arr.length;
        const ret = new Array(len);
        for (let i = 0; i < len; i++) {
            ret[i] = arr[i];
        }
        return ret;
    },

    cloneShallow(value) {
        return isArray(value) ? fns.cloneArray(value) : fns.cloneObject(value);
    },

    // define a cache for changes. changes won't happen until applyMutation is called
    stageMutations(obj) {
        addPropertyTo(obj, cacheKey, {});
        return obj;
    },

    // apply stages mutations
    applyMutations(obj) {
        const cache = obj[cacheKey];
        obj[cacheKey] = null;
        const clone = fns.cloneShallow(obj);
        const keys = Object.keys(cache);
        for (let i = 0, len = keys.length; i < len; i++) {
            const p = keys[i];
            const cur = cache[p];
            cur[p] = fns.cloneShallow(cur[p]);
        }
        return clone;
    },

    // traverse an object. accepts a callback which will be called for each node,
    // with the value and current path to the node from the root object, as well
    // as a third value to be true if the node is an object.
    traverse(obj, cb, context = '') {
        const keys = Object.keys(obj);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            const path = context ? context + '.' + key : key;
            const val = obj[key];
            if (isObject(val)) {
                fns.traverse(val, cb, path);
                cb(val, path, true);
            } else {
                cb(val, path);
            }
        }
    },

    // deep freeze an object, convenient for development.
    freeze(obj) {
        Object.freeze(obj);
        fns.traverse(obj, (val, path, isObject) =>
            isObject && Object.freeze(path));
        return obj;
    },
}

const isChangeless = obj => obj instanceof Changeless;

export const update = (obj, path, fn) => {

    if (isChangeless(obj)) {
        return obj.update(path, fn);
    }

    path = isString(path) ? path.split('.') : path;
    const cache = obj[cacheKey];
    let cloned = obj;
    if (!cache) {
        cloned = fns.cloneShallow(obj);
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
                cur[p] = fns.cloneShallow(c);
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

export const withMutations = (obj, fn) => {

    if (isChangeless(obj)) {
        return obj.withMutations(fn);
    }

    fns.stageMutations(obj);
    fn(new Changeless(obj));
    return fns.applyMutations(obj);
}

export const merge = function() {

    const obj = arguments[0];

    if (isChangeless(obj)) {
        const args = sliceArguments(arguments, 1);
        return obj.merge.apply(null, args);
    }

    let cache = obj[cacheKey];
    let isMutable = true;

    if (!cache) {
        isMutable = false;
        cache = {};
    }

    const traverser = (val, path, isObject) => {
        if (!isObject && !cache[path]) {
            cache[path] = val;
        }
    };

    for (let i = arguments.length - 1; i > 0; i--) {
        fns.traverse(arguments[i], traverser);
    }

    return isMutable
        ? obj
        : withMutations(obj, o => {
            const keys = Object.keys(cache);
            for (let i = 0, len = keys.length; i < len; i++) {
                const key = keys[i];
                o.set(key, cache[key]);
            }
    });
};

export const set = update;

const publicAPI = {merge, update, set, withMutations};

const proxify = (target, source) => {
    const keys = Object.keys(source);
    for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        Object.defineProperty(target, key, {
            get(key) {
                return source[key];
            }
        });
    }
}

const Changeless = function Changeless(context, {proxy} = {}) {

    if (isChangeless(context)) {
        return context;
    }

    // "call constructor"
    if (!isChangeless(this)) {
        return new Changeless(context)
    }

    this._context = context;

    if (proxy) {
        proxify(this, context);
    }

}

Changeless.prototype.value = function() {
    return this._context;
};

Object.keys(publicAPI).forEach(key => {
    Changeless[key] = publicAPI[key];
    Changeless.prototype[key] = function() {
        const args = [this._context, ...arguments];
        this._context = publicAPI[key].apply(null, args);
        return this;
    }
});

export default Changeless;
