

An immmutable helper written in the context of React pure rendering, but can be used wherever uniqueness of object references is beneficial.

You can read about this kind of optimisation here: https://facebook.github.io/react/docs/advanced-performance.html.

Unlike other solutions like seamless-immutable and immutable-js, the functions exposed by this module are not instance methods and do not require creating new instances of data structures to use. There is no notion of interop or compatibility as the data is always plain JS.

This also means that there are no changes to existing JS data objects or arrays, and mutating is still very much possible.

## Features

- Simple, minimalistic API

	Does what you'd expect, no implicit behavior.

- Built around performance

	Utilizes several ways to increase performance: caching, fast structural object cloning, batching, lazy evaluation.

- Wrapper utility (similar to lodash)

	The default export of the module is a function that can be used to wrap an object, which exposes the module's API with several useful benefits: chaining, lazy evalutaion and batching (more on this later).

## Performance

<module> was built with performance in mind. For small to mid-sized data, <module> performs even better than immutable.js, without sacrificing flexibility with a layer of pervasive API. If data is organized mainly in arrays and not plain objects, performance goes up further by a hefty margin. 

Memory performance depends on garbage collection, but noticable slowdowns during benchmarking haven't been observed. In addition, there is absolutely no "set-up" cost, in time nor memory, since nothing but plain objects and arrays are used (including using the wrapper utility, which does nothing but store a reference to the object and doesn't do anything to it).

## API Reference

### set

Takes an object, a path, and a value or function. If a function is provided, it will be called with the current value in the object with the given path (like `update` in immutablejs).

Path can be an array or a (dot-separated) string.

This method has all the functionality of set/setIn/update/updateIn depending on the parameters.

### merge

Takes a target object, and sources objects, and merges them into the target, returning a new deeply merged object reference.

### withMutations

Takes an object and a function which is called with a wrapped object as the only argument. Any methods called will have the same wrapped features applied and the resulting new object will be returned. This is equivalent to wrapping the object and calling #value on a chain of actions.

### Wrapper

Wraps a given object and allows any API methods to be used on the returned wrapped object as instance methods. This allows for:

- Chaining

	All methods return the instance.

- Lazy evalutaion

	Methods aren't executed until `#value` is called. This also allows, using the `#plant` method, to create reusable wrappers.

- Batching

	All methods are run in caching mode instead of being applied to the wrapped object immediately. When `#value` is called, the latest changes are applied and cloning happens the minimal number of times necessary.

	#### value

	Performs the actions and returns a new object reference with the prescribed mutations.

	#### plant

	Replaces the wrapped object with another object for reusability.