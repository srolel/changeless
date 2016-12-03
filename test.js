require('babel-core/register');
require('reacquire')({register: true});
var chokidar = require('chokidar');

require.uncache = function (moduleName) {
    // Run over the cache looking for the files
    // loaded by the specified module name
    require.searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(moduleName)>0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

/**
 * Runs over the cache to search for all the cached
 * files
 */
require.searchCache = function (moduleName, callback) {
    // Resolve the module identified by the specified name
    var mod = require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        // Recursively go over the results
        (function run(mod) {
            // Go over each of the module's children and
            // run over it
            mod.children.forEach(function (child) {
                run(child);
            });

            // Call the specified callback providing the
            // found module
            callback(mod);
        })(mod);
    }
};

var Mocha = require('mocha'),
    fs = require('fs'),
    path = require('path');

var runTests = function() {
	// Instantiate a Mocha instance.
	var mocha = new Mocha();

	var testDir = 'tests';
	// Add each .js file to the mocha instance
	require.uncache('./tests/index.js');
	mocha.addFile('tests/index.js');
	// Run the tests.
	mocha.run();
};

chokidar
	.watch(['tests/*', 'src/*'])
	.on('all', runTests);

