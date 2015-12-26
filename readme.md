

An immmutable helper written in the context of React pure rendering, but can be used wherever uniqueness of object references is beneficial.

You can read about this kind of optimisation here: https://facebook.github.io/react/docs/advanced-performance.html.

If we think of a state atom as a tree, every time one of its nodes needs to be updated, we want to update all the nodes leading up to that node. By update we mean getting a new object reference if the node is an object, or a new value otherwise. The rest of the tree should remain unchanged. This is done by shallow cloning each reference that needs to be changed, or assigning a new value to replace updated primitives.

Unlike other solutions like seamless-immutable and immutable-js, the methods exposed by this module are functional and do not require creating new instances of data structures to use. There is no notion of interop as the data is always plain JS. 

Features:

- Structural cloning for objects.

Proprietary cloner functions are created for objects and cached.

- Wrapper utility (similar to lodash)

	The default export of the module is a function that can be used to wrap an object, which exposes the module's API with the following benefits:

	- Chaining

		All methods return the instance for convenience.

	- Lazy evalutaion

		Methods aren't executed until `#value` is called. This also allows, using the `#plant` method, to create reusable wrappers.

	- Batching

		All methods are run in caching mode instead of being applied to the wrapped object immediately. When `#value` is called, the latest changes are applied and cloning happens the minimal number of times necessary.

