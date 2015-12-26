 
const isObject = value => value && typeof value === 'object';

 const forEachInObject = (obj, cb) => {
        const keys = Object.keys(obj);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            cb(obj[key], key, obj);
        }
    };

const traverse =(obj, cb, context = '') => {
    forEachInObject(obj, (val, key) => {

        const path = context ? context + '.' + key : key;
        const isObj = isObject(val);

        cb(val, key, path, obj, isObj);
        if (isObj) {
            // obj[key] instead of val to take changes as we traverse into account
            traverse(val, cb, path);
        }
    });
};

const objectToArray = object => {
    traverse(object, (val, key, path, obj, isObj) => {
    	if (isObj) {
    		obj[key] = Object.keys(val).map(k => [k, val[k]]);
    	}
    });
    return object;
};

console.log(objectToArray({a:1}));