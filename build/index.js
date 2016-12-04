'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var __DEV__ = process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && localStorage.getItem('debug') === 'changeless';

var isFunction = function isFunction(value) {
    return typeof value === 'function';
};
var isUndefined = function isUndefined(value) {
    return value === undefined;
};
var isString = function isString(value) {
    return typeof value === 'string';
};
var isArray = Array.isArray;

var isArrayLike = function isArrayLike(value) {
    return length in value;
};
var isObject = function isObject(value) {
    return (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && value !== null;
};

var sliceArguments = function sliceArguments(args, start) {
    var end = arguments.length <= 2 || arguments[2] === undefined ? args.length : arguments[2];

    var ret = Array(end - start);
    for (var i = start, j = 0; i < end; i++, j++) {
        ret[j] = args[i];
    }return ret;
};

var maybeExecute = function maybeExecute(maybeFn, arg) {
    return isFunction(maybeFn) ? maybeFn(arg) : maybeFn;
};

var pathSplitter = '___';

var pathToArray = function pathToArray(path) {
    var splitter = arguments.length <= 1 || arguments[1] === undefined ? pathSplitter : arguments[1];
    return isString(path) ? path.split(splitter) : path;
};

// Symbols
var cacheKey = '__changeless__cache__';
var clonerKey = '__changeless__cloner__';
var didChange = '__changeless__did__change__';

var dummy = {};

// add non-enumerable properties to objects
var addPropertyTo = function addPropertyTo(target, methodName, value) {
    return Object.defineProperty(target, methodName, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: value
    });
};

var hasCache = function hasCache(obj) {
    return Boolean(obj[cacheKey]);
};

// exporting for tests
var fns = {

    // generates a structured clone function for a given object

    createCloner: function createCloner(obj) {
        var objDef = '{';

        fns.forEachInObject(obj, function (val, key) {
            return objDef += '\'' + key + '\': obj[\'' + key + '\'],';
        });

        objDef += '}';
        return Function('obj', 'return ' + objDef);
    },
    simpleCloner: function simpleCloner(obj) {
        var target = {};
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                target[i] = obj[i];
            }
        }
        return target;
    },


    // clones object using the generated cloner.
    // saves that cloner as a property the object and clone
    cloneObject: function cloneObject(obj) {
        var cloner = obj[clonerKey];
        if (!cloner) {
            cloner = fns.createCloner(obj);
            addPropertyTo(obj, clonerKey, cloner);
        }
        var clone = cloner(obj);
        addPropertyTo(clone, clonerKey, cloner);
        return clone;
    },
    cloneArray: function cloneArray(arr) {
        var res = Array(arr.length);
        for (var i = 0; i < arr.length; i++) {
            res[i] = arr[i];
        }return res;
    },
    cloneShallow: function cloneShallow(value) {
        return isArray(value) ? fns.cloneArray(value) : fns.cloneObject(value);
    },
    forEachInArrayRight: function forEachInArrayRight(arr, cb) {
        for (var i = arr.length - 1; i >= 0; i--) {
            if (cb(arr[i], i, arr) === false) return;
        }
    },
    forEachInArray: function forEachInArray(arr, cb) {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (cb(arr[i], i, arr) === false) return;
        }
    },
    forEachInObject: function forEachInObject(obj, cb) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (cb(obj[key], key, obj) === false) return;
            }
        }
    },
    iterate: function iterate(value) {
        return isArrayLike(value) ? fns.forEachInArray(value) : fns.forEachInObject(value);
    },


    // define a cache for changes. changes won't happen until applyMutation is called
    stageMutations: function stageMutations(obj) {
        var cache = isArray(obj) ? [] : {};
        addPropertyTo(obj, cacheKey, cache);
        return obj;
    },


    // apply stages mutations
    applyMutations: function applyMutations(object, changes) {
        var cache = object[cacheKey];
        var changesToApply = changes || fns.getMergerChanges(cache);
        var cloned = fns.cloneShallow(object);
        fns.traverse(cloned, function (val, key, path, obj, isObj) {
            if (changesToApply.hasOwnProperty(path)) {
                // pass over objects in the path, cloning all of their properties.
                // if it's the value we want to set, set it.
                obj[key] = isObj ? fns.cloneShallow(obj[key]) : changesToApply[path];

                changesToApply[path] = didChange;
            } else {
                // short-cut, stop traversing path if it isn't in the changes.
                return false;
            }
        });
        // other changes to new paths on the object.
        fns.forEachInObject(changesToApply, function (val, path) {
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
    getMergerChanges: function getMergerChanges() {

        var contextPath = arguments[0];
        var hasPath = isString(contextPath);
        var arrayPath = pathToArray(contextPath);

        var changes = {};
        var args = arguments;

        if (hasPath) {
            (function () {
                args = sliceArguments(args, 1);
                var path = '';
                fns.forEachInArray(arrayPath, function (val) {
                    path = path ? '' + path + pathSplitter + val : val;
                    changes[path] = dummy;
                });
            })();
        }

        var doTraverse = function doTraverse(obj) {
            return fns.traverse(obj, function (value, key, path) {

                if (hasPath) {
                    path = '' + contextPath + pathSplitter + path;
                }

                if (!changes.hasOwnProperty(path)) {
                    changes[path] = value;
                }
            });
        };

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
    mutateMerge: function mutateMerge() {
        var args = sliceArguments(arguments, 1);
        var changes = fns.getMergerChanges.apply(null, args);

        var target = arguments[0];

        // apply changes
        fns.forEachInObject(changes, function (val, path) {
            return fns.walkPathInObject(target, path, fns.getPathUpdater(val, true));
        });

        return target;
    },


    // _traverse(obj, cb, context = '') {
    //     fns.forEachInObject(obj, (val, key) => {

    //         const path = context ? context + pathSplitter + key : key;
    //         const isObj = isObject(val);

    //         const shouldContinue = cb(val, key, path, obj, isObj);
    //         if (isObj && shouldContinue !== false) {
    //             // obj[key] instead of val to take changes as we traverse into account
    //             fns._traverse(obj[key], cb, path);
    //         }
    //     });
    // },

    /**
     * @name traverse
     * traverse an object with a callback.
     * @param {object|array} obj object to traverse.
     * @param {function} cb callback for each node. will be called for each node,
     * with the value and current path to the node from the root object, as well
     * as a third value to be true if the node is an object.
     * @returns {undefined} N/A
     */

    // TODO improve perf
    traverse: function traverse(obj, cb) {
        var context = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];

        var keys = [],
            objs = [],
            paths = [];
        for (var k in obj) {
            keys.push(k);
            objs.push(obj);
            paths.push(context);
        }
        for (var i = 0, len = keys.length; i < len; i++) {
            var key = keys[i];
            var _obj = objs[i];
            var val = _obj[key];
            var _context2 = paths[i];
            var path = _context2 ? _context2 + pathSplitter + key : key;
            var isObj = isObject(val);

            var shouldContinue = cb(val, key, path, _obj, isObj);

            if (isObj && shouldContinue !== false) {
                var keyObj = _obj[key];
                for (var _k in keyObj) {
                    keys.push(_k);
                    objs.push(keyObj);
                    paths.push(path);
                    len++;
                }
            }
        }
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
    walkPathInObject: function walkPathInObject(obj, path, cb, cache) {
        var withCache = isObject(cache);

        var arrayPath = pathToArray(path);

        var curObj = obj;
        var curCache = cache;
        fns.forEachInArray(arrayPath, function (p, i, arr) {
            var context = curCache || curObj;
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
    freeze: function freeze(obj) {
        Object.freeze(obj);
        fns.traverse(obj, function (val, path, isObj) {
            return isObj && Object.freeze(path);
        });
        return obj;
    },
    getPathUpdater: function getPathUpdater(fn, dontClone) {
        var toClone = [];
        return function (context, key, currentValue) {
            switch (arguments.length) {
                // inner object
                case 2:
                    var c = context[key];
                    if (isUndefined(c) || !isObject(c)) {
                        context[key] = {};
                    } else if (!dontClone) {
                        toClone.push([context, key]);
                    }
                    break;
                // value to set
                case 3:
                    var value = maybeExecute(fn, currentValue);
                    // only set if necessary, ignore NaN
                    if (context[key] !== value && value === value) {
                        (function () {

                            // if we passed over objects, clone them
                            var last = toClone.length - 1;

                            fns.forEachInArray(toClone, function (_ref, i) {
                                var _ref2 = _slicedToArray(_ref, 2);

                                var _context = _ref2[0];
                                var _key = _ref2[1];

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
                                    var formatted = '<object>';
                                    try {
                                        var stringified = JSON.stringify(context);
                                        formatted = stringified.length > 20 ? stringified.slice(0, 20) + '... }' : stringified;
                                    } catch (e) {}
                                    console.warn('Setting a new  property <' + key + '> on ' + formatted + '. This causes de-optimisation in object cloning');
                                }

                                addPropertyTo(context, clonerKey, fns.simpleCloner);
                            }

                            context[key] = value;
                        })();
                    }
                    break;
            }
        };
    },
    get: function get(obj, path) {
        var arrayPath = pathToArray(path);
        fns.forEachInArray(arrayPath, function (p) {
            if (!isObject(obj)) {
                obj = undefined;
                return false;
            }
            obj = obj[p];
        });
        return obj;
    }
};

var update = function update(obj, path, fn) {
    if (isChangeless(obj)) {
        return obj.update(path, fn);
    }

    var cache = obj[cacheKey];
    var cloned = cache ? obj : fns.cloneShallow(obj);
    var updater = fns.getPathUpdater(fn, Boolean(cache));

    fns.walkPathInObject(cloned, path, updater, cache);

    return cloned;
};

var withMutations = function withMutations(obj, fn) {

    if (isChangeless(obj)) {
        return obj.withMutations(fn);
    }

    var actions = this && this.__actions__;

    var changeless = new Changeless(obj, actions);

    var mutated = fn(changeless);

    return hasCache(obj) ? mutated : changeless.value();
};

var merge = function merge() {
    var obj = arguments[0];

    if (isChangeless(obj)) {
        return obj.merge.apply(obj, args);
    }

    var cache = obj[cacheKey];

    var args = sliceArguments(arguments, 1);

    var path = args[0];
    var hasPath = isString(path);

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
        var changes = fns.getMergerChanges.apply(null, args);
        return fns.applyMutations(obj, changes, !hasPath);
    }
};

var set = update;

var publicAPI = { merge: merge, update: update, set: set, withMutations: withMutations };

var isChangeless = function isChangeless(obj) {
    return obj instanceof Changeless;
};

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
var Changeless = function Changeless(wrapped, actions) {

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
Changeless.prototype.value = function () {

    var wrapped = this.__wrapped__;
    var actions = this.__actions__;

    // since the instance's __actions__ is mutated as we go through the actions,
    // save a copy and restore it when done, so we can call `value` again.
    var savedActions = fns.cloneArray(actions);
    fns.stageMutations(wrapped);
    for (var i = 0, len = actions.length; i < len; i++, len = actions.length) {
        actions[i](wrapped);
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
Changeless.prototype.plant = function (wrapped) {
    this.__wrapped__ = wrapped;
    return this;
};

fns.forEachInObject(publicAPI, function (val, key) {
    Changeless[key] = val;
    Changeless.prototype[key] = function () {
        var _arguments = arguments,
            _this = this;

        this.__actions__.push(function (obj) {
            var args = [obj].concat(Array.prototype.slice.call(_arguments));
            return val.apply(_this, args);
        });
        return this;
    };
});

exports.fns = fns;
exports.default = Changeless;
exports.update = update;
exports.withMutations = withMutations;
exports.merge = merge;
exports.set = set;