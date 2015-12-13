const isFunction = value => typeof value === 'function';
const isUndefined = value => value === undefined;
const isUndefinedOrNull = value => value == undefined;
const isString = value => typeof value === 'string';
const {isArray} = Array;
const isArrayLike = value => length in value;
const isObject = value => value && typeof value === 'object';

const sliceArguments = (args, start, end) =>
    Array.prototype.slice.apply(args, [start, end]);

const maybeExecute = (maybeFn, arg) =>
    isFunction(maybeFn) ? maybeFn(arg) : maybeFn;

const cacheKey = '__changeless__cache__';
const clonerKey = '__changeless__cloner__';
const didChange = '__changeless__did__change__';

const iterateObject = (obj, cb) => {
    const keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        cb(obj[key], key);
    }
};

const addPropertyTo = (target, methodName, value) => Object.defineProperty(
    target, methodName, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: value
    });

const hasCache = obj => Boolean(obj[cacheKey]);

// exporting for tests
export const fns = {

    // generates a structured clone function for a given object
    createCloner(obj) {
        var objDef = '{';

        iterateObject(obj, (val, key) =>
            objDef += `'${key}': obj['${key}'],`);

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

    // cloneObject: Object.create,

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

    iterateArrayRight(arr, cb) {
        for (let i = arr.length - 1; i >= 0; i--) {
            cb(arr[i], i, arr);
        }
    },

    iterateArray(arr, cb) {
        for (let i = 0, len = arr.length; i < len; i++) {
            const result = cb(arr[i], i, arr);
            if (result === true) {
                return arr[i];
            }
        }
    },

    iterateObject(obj, cb) {
        const keys = Object.keys(obj);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            const result = cb(obj[key], key, obj);
            if (result === true) {
                return obj[key];
            }
        }
    },

    iterate(value) {
        return isArrayLike(value) ? fns.iterateArray(value) : fns.iterateObject(value);
    },

    // define a cache for changes. changes won't happen until applyMutation is called
    stageMutations(obj) {
        const cache = isArray(obj) ? [] : {};
        addPropertyTo(obj, cacheKey, cache);
        return obj;
    },


    // apply stages mutations
    applyMutations(object, changes) {

        const cache = object[cacheKey];
        const changesToApply = changes || fns.getMergerChanges(cache);
        const cloned = fns.cloneShallow(object);

        fns.traverse(cloned, (val, key, path, obj, isObj) => {
            if (path in changesToApply) {
                if (isObj) {
                    obj[key] = fns.cloneShallow(obj[key]);
                } else {
                    obj[key] = changesToApply[path];
                }
                changesToApply[path] = didChange;
            }
        });

        iterateObject(changesToApply, (val, path) => {
            if (val !== didChange) {
                fns.walkPathInObject(cloned, path, fns.getPathUpdater(val, true));
            }
        })


        return cloned;
    },


    getMergerChanges() {
        const changes = {};

        const doTraverse = obj => fns.traverse(
            obj,
            (value, key, path, obj, isObj) =>
                !(path in changes) &&(changes[path] = value)
        );

        // collect changes
        if (arguments.length === 1) {
            doTraverse(arguments[0]);
        } else {
            fns.iterateArrayRight(arguments, doTraverse)
        }

        return changes;
    },


    mutateMerge() {
        const args = sliceArguments(arguments, 1);
        const changes = fns.getMergerChanges.apply(null, args);

        const target = arguments[0];

        // apply changes
        fns.iterateObject(changes, (val, path) =>
            fns.walkPathInObject(target, path, fns.getPathUpdater(val, true)));

        return target;
    },

    // traverse an object. accepts a callback which will be called for each node,
    // with the value and current path to the node from the root object, as well
    // as a third value to be true if the node is an object.

    traverse(obj, cb, context = '') {
        iterateObject(obj, (val, key) => {

            const path = context ? context + '.' + key : key;
            const isObj = isObject(val);

            cb(val, key, path, obj, isObj);
            if (isObj) {
                // obj[key] instead of val to take changes as we traverse into account
                fns.traverse(obj[key], cb, path);
            }
        })
    },

    walkPathInObjectWithCache(obj, path, cb, cache) {

        const arrayPath = isString(path) ? path.split('.') : path;
        const len = arrayPath.length;
        let curObj = obj;
        let curCache = cache;
        for (let i = 0; i < len - 1; i++) {
            const p = arrayPath[i];
            cb(curCache, p, i);
            curObj = !isUndefinedOrNull(curObj) && curObj[p];
            curCache = !isUndefinedOrNull(curCache) && curCache[p];
        }

        const last = arrayPath[len - 1];
        const value = !isUndefinedOrNull(curObj) && curObj[last];
        cb(curCache, last, len - 1, value);
    },

    walkPathInObject(obj, path, cb, cache) {
        if (isObject(cache)) {
            return fns.walkPathInObjectWithCache(obj, path, cb, cache);
        }

        const arrayPath = isString(path) ? path.split('.') : path;
        const len = arrayPath.length;
        let curObj = obj;
        for (let i = 0; i < len - 1; i++) {
            const p = arrayPath[i];
            cb(curObj, p, i);
            curObj = !isUndefinedOrNull(curObj) && curObj[p];
        }

        const last = arrayPath[len - 1];
        const value = !isUndefinedOrNull(curObj) && curObj[last];
        cb(curObj, last, len - 1, curObj[last]);
    },

    // deep freeze an object, convenient for development.
    freeze(obj) {
        Object.freeze(obj);
        fns.traverse(obj, (val, path, isObject) =>
            isObject && Object.freeze(path));
        return obj;
    },

    getPathUpdater(fn, dontClone) {
        return function(context, key, path, currentValue) {
            switch (arguments.length) {
                // inner object
                case 2:
                case 3:
                    let c = context[key];
                    if (isUndefined(c) || !isObject(c)) {
                        c = context[key] = {};
                    }
                    if (!dontClone) {
                        context[key] = fns.cloneShallow(c);
                    }
                    break;
                // value to set
                case 4:
                    const value = maybeExecute(fn, currentValue);
                    context[key] = value;
                    break;
            }
        }
    }
};

const isChangeless = obj => obj instanceof Changeless;

export const map = (obj, fn) => {

    if (isChangeless(obj)) {
        return obj.map(fn);
    }

    fns.iterate(obj, (val, key, obj) => {
        set(val, key, fn(val, key, obj));
    })
};



export const update = (obj, path, fn) => {
    if (isChangeless(obj)) {
        return obj.update(path, fn);
    }

    const arrayPath = isString(path) ? path.split('.') : path;
    const cache = obj[cacheKey];

    const cloned = cache ? obj : fns.cloneShallow(obj);
    const updater = fns.getPathUpdater(fn, Boolean(cache));

    fns.walkPathInObject(
        cloned,
        path,
        updater,
        cache
    );

    return cloned;
};

export const withMutations = function(obj, fn) {

    if (isChangeless(obj)) {
        return obj.withMutations(fn);
    }

    const actions = this && this.__actions__;

    const changeless = new Changeless(obj, actions);

    const mutated = fn(changeless);

    return hasCache(obj)
        ? mutated
        : changeless.value();
}

export const merge = function() {

    const obj = arguments[0];

    if (isChangeless(obj)) {
        return obj.merge.apply(obj, args);
    }

    const cache = obj[cacheKey];

    const args = sliceArguments(arguments, 1);
    if (cache) {
        args.unshift(cache);
        fns.mutateMerge.apply(null, args);
    } else {
        const changes = fns.getMergerChanges.apply(null, args);  
        return fns.applyMutations(obj, changes);
    }
};

export const set = update;

const publicAPI = {merge, update, set, map, withMutations};

// const proxify = (target) => {
//     iterateObject(target.__wrapped__, (val, key) =>
//         Object.defineProperty(target, key, {
//             get() {
//                 return target.__wrapped__[key];
//             },
//             enumerable: true,
//             configurable: true
//         }));
// }

const Changeless = function Changeless(context, actions) {

    if (isChangeless(context)) {
        return context;
    }

    // "call constructor"
    if (!isChangeless(this)) {
        return new Changeless(context, actions)
    }

    this.__wrapped__ = context;
    this.__actions__ = actions || [];
    // this._config = opts;

    // if (opts.proxy) {
    //     proxify(this);
    // }

}

Changeless.prototype.value = function() {

    let wrapped = this.__wrapped__;
    const actions = this.__actions__;

    fns.stageMutations(wrapped);
    while (actions.length) {
        actions.shift()(wrapped);
    }
    return fns.applyMutations(wrapped);

};

iterateObject(publicAPI, (val, key) => {
    Changeless[key] = val;
    Changeless.prototype[key] = function() {
        this.__actions__.push(obj => {
            const args = [obj, ...arguments];
            return val.apply(this, args);
        });
        return this;
    }
})

export default Changeless;
