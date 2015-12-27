let __DEV__ = process.env.NODE_ENV !== 'production';

const isFunction = value => typeof value === 'function';
const isUndefined = value => value === undefined;
const isString = value => typeof value === 'string';
const {isArray} = Array;
const isArrayLike = value => length in value;
const isObject = value => typeof value === 'object';

const sliceArguments = (args, start, end) =>
    Array.prototype.slice.apply(args, [start, end]);

const maybeExecute = (maybeFn, arg) =>
    isFunction(maybeFn) ? maybeFn(arg) : maybeFn;

const pathToArray = path => isString(path) ? path.split('.') : path;

// Symbols
const cacheKey = '__changeless__cache__';
const clonerKey = '__changeless__cloner__';
const didChange = '__changeless__did__change__';

const dummy = {};

// add non-enumerable properties to objects
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
        let objDef = '{';

        fns.forEachInObject(obj, (val, key) =>
            objDef += `'${key}': obj['${key}'],`);

        objDef += '}';
        return Function('obj', 'return ' + objDef);
    },

    simpleCloner(obj) {
        let target = {};
        for (let i in obj) {
            if (obj.hasOwnProperty(i)) {
                target[i] = obj[i];
            }
        }
        return target;
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
      return arr.slice(0);
    },

    cloneShallow(value) {
        return isArray(value) ? fns.cloneArray(value) : fns.cloneObject(value);
    },

    forEachInArrayRight(arr, cb) {
        for (let i = arr.length - 1; i >= 0; i--) {
            const result = cb(arr[i], i, arr);
            if (result === false) {
                return;
            }
        }
    },

    forEachInArray(arr, cb) {
        for (let i = 0, len = arr.length; i < len; i++) {
            const result = cb(arr[i], i, arr);
             if (result === false) {
                return;
            }
        }
    },

    forEachInObject(obj, cb) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                const result = cb(obj[key], key, obj);
                if (result === false) {
                    return;
                }
            }
        }
    },

    iterate(value) {
        return isArrayLike(value) ? fns.forEachInArray(value) : fns.forEachInObject(value);
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
            if (changesToApply.hasOwnProperty(path)) {

                // pass over objects in the path, cloning all of their properties.
                // if it's the value we want to set, set it.
                obj[key] = isObj
                    ? fns.cloneShallow(obj[key])
                    : changesToApply[path];

                changesToApply[path] = didChange;
            } else {
                // short-cut, stop traversing path if it isn't in the changes.
                return false;
            }
        });
        // other changes to new paths on the object.
        fns.forEachInObject(changesToApply, (val, path) => {
            if (val !== didChange) {
                fns.walkPathInObject(cloned, path, fns.getPathUpdater(val, true));
            }
        });


        return cloned;
    },

    /**
     * @name getMergerChanges
     * @returns {object} an object with all the changes needed for the merge,
     * as [path, value] pairs.
     */
    getMergerChanges() {

        const contextPath = arguments[0];
        const hasPath = isString(contextPath);
        const arrayPath = pathToArray(contextPath);

        const changes = {};
        let args = arguments;

        if (hasPath) {
            args = sliceArguments(args, 1);
            arrayPath.reduce((path, cur) => {
                path = path ? `${path}.${cur}` : cur;
                changes[path] = dummy;
                return path;
            }, '');
        }

        const doTraverse = obj => fns.traverse(
            obj,
            (value, key, path) => {

                if (hasPath) {
                    path = `${contextPath}.${path}`;
                }

                if (!changes.hasOwnProperty(path)) {
                    changes[path] = value;
                }
            }
        );

        // collect changes
        fns.forEachInArrayRight(args, doTraverse);

        return changes;
    },

    /**
     * @name mutateMerge
     * merges sources into target, mutates the merge target.
     * @param {object|array} target merge target.
     * @params {object|array} sources merge sources.
     * @returns {object|array} merged target
     */
    mutateMerge() {
        const args = sliceArguments(arguments, 1);
        const changes = fns.getMergerChanges.apply(null, args);

        const target = arguments[0];

        // apply changes
        fns.forEachInObject(changes, (val, path) =>
            fns.walkPathInObject(target, path, fns.getPathUpdater(val, true)));

        return target;
    },

    /**
     * @name traverse
     * traverse an object with a callback.
     * @param {object|array} obj object to traverse.
     * @param {function} cb callback for each node. will be called for each node,
     * with the value and current path to the node from the root object, as well
     * as a third value to be true if the node is an object.
     * @returns {undefined} N/A
     */
    traverse(obj, cb, context = '') {
        fns.forEachInObject(obj, (val, key) => {

            const path = context ? context + '.' + key : key;
            const isObj = isObject(val);

            const shouldContinue = cb(val, key, path, obj, isObj);
            if (isObj && shouldContinue !== false) {
                // obj[key] instead of val to take changes as we traverse into account
                fns.traverse(obj[key], cb, path);
            }
        });
    },

    /**
     * @name walkPathInObject
     * updates an object path (or a cache).
     * @param {object} obj
     * @param {string|array} path
     * @param {function} cb
     * @param {object} cache optionally use a cache to store the changes
     *                       instead of the object.
     * @returns {undefined} N/A
     */
    walkPathInObject(obj, path, cb, cache) {
        const withCache = isObject(cache);

        const arrayPath = pathToArray(path);

        let curObj = obj;
        let curCache = cache;
        fns.forEachInArray(arrayPath, (p, i, arr) => {
            const context = curCache || curObj;
            if (i === arr.length - 1) {
                cb(context, p, context[p]);
            } else {
                cb(context, p);
                curObj = curObj[p];
                if (withCache) {
                    curCache = curCache[p];
                }
            }
        });
    },

    // deep freeze an object, convenient for development.
    freeze(obj) {
        Object.freeze(obj);
        fns.traverse(obj, (val, path, isObj) =>
            isObj && Object.freeze(path));
        return obj;
    },

    getPathUpdater(fn, dontClone) {
        const toClone = [];
        return function(context, key, currentValue) {
            switch (arguments.length) {
                // inner object
                case 2:
                    let c = context[key];
                    if (isUndefined(c) || !isObject(c)) {
                        context[key] = {};
                    } else if (!dontClone) {
                        toClone.push([context, key]);
                    }
                    break;
                // value to set
                case 3:
                // console.log(toClone)
                    const value = maybeExecute(fn, currentValue);
                    // only set if necessary, ignore NaN
                    if (context[key] !== value && value === value) {

                        // if we passed over objects, clone them
                            const last = toClone.length - 1;

                            fns.forEachInArray(toClone, ([_context, _key], i) => {
                                _context[_key] = fns.cloneShallow(_context[_key]);

                                // update the property on the *cloned* context
                                if (i === last) {
                                    context = _context[_key];
                                }
                            });

                            // set the value.
                            // this should be done here and only here, in the whole module.
                            if (context[clonerKey] && !(key in context)) {
                                if (__DEV__) {
                                    const stringified = JSON.stringify(context);
                                    const formatted = stringified.length > 20 ? stringified.slice(0, 20) + '... }' : stringified;
                                    console.warn(`Setting a new  property <${key}> on ${formatted}. This causes de-optimisation in object cloning`);
                                }

                                addPropertyTo(context, clonerKey, fns.simpleCloner);
                            }

                            context[key] = value;
                    }
                    break;
            }

        };
    },

    get(obj, path) {
        const arrayPath = pathToArray(path);
        fns.forEachInArray(arrayPath, p => {
            if (!isObject(obj)) {
                obj = undefined;
                return false;
            }
            obj = obj[p];
        });
        return obj;
    }
};

export const update = (obj, path, fn) => {
    if (isChangeless(obj)) {
        return obj.update(path, fn);
    }

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
};

export const merge = function() {
    const obj = arguments[0];

    if (isChangeless(obj)) {
        return obj.merge.apply(obj, args);
    }

    let cache = obj[cacheKey];

    const args = sliceArguments(arguments, 1);

    const path = args[0];
    const hasPath = isString(path);

    if (hasPath) {
        args.unshift();
    }

    if (cache) {

        if (hasPath) {
            fns.walkPathInObject(cache, path, fns.getPathUpdater({}, true));
            cache = fns.get(cache, path);
        }

        args.unshift(cache);
        fns.mutateMerge.apply(null, args);
    } else {
        const changes = fns.getMergerChanges.apply(null, args);
        return fns.applyMutations(obj, changes, !hasPath);
    }
};

export const set = update;

const publicAPI = {merge, update, set, withMutations};

const isChangeless = obj => obj instanceof Changeless;

/**
 * Creates a new changeless instance. can be called as a regular function.
 * Similar to lodash wrappers, batches operations and performs them lazily,
 * when Changeless#value is called.
 * All API methods can be called as methods of this class' instances, without
 * the object as the first argument.
 * e.g. set(someObject, 'a.b', 42) becomes wrappedObject.set('a.b', 42).
 * @class
 * @param {object|array} wrapped object or array to wrap for batched mutations.
 * @param {array} actions existing actions (used internally).
*/
const Changeless = function Changeless(wrapped, actions) {

    if (isChangeless(wrapped)) {
        return wrapped;
    }

    // "call constructor"
    if (!isChangeless(this)) {
        return new Changeless(wrapped, actions);
    }

    this.__wrapped__ = wrapped;
    this.__actions__ = actions || [];
};

/**
 * performs the actions on the wrapped object, and returns the object/array.
 * @method
 * @name value
 * @returns {object|array}
*/
Changeless.prototype.value = function() {

    let wrapped = this.__wrapped__;
    const actions = this.__actions__;

    // since the instance's __actions__ is mutated as we go through the actions,
    // save a copy and restore it when done, so we can call `value` again.
    const savedActions = actions.slice(0);
    fns.stageMutations(wrapped);
    while (actions.length) {
        actions.shift()(wrapped);
    }

    this.__actions__ = savedActions;

    return fns.applyMutations(wrapped);

};

/**
 * Plants another wrapped object/array in the wrapper.
 * @method
 * @name plant
 * @param {object|array} wrapped
*/
Changeless.prototype.plant = function(wrapped) {
    this.__wrapped__ = wrapped;
    return this;
};

fns.forEachInObject(publicAPI, (val, key) => {
    Changeless[key] = val;
    Changeless.prototype[key] = function() {
        this.__actions__.push(obj => {
            const args = [obj, ...arguments];
            return val.apply(this, args);
        });
        return this;
    };
});

export default Changeless;
