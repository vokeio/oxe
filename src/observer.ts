console.warn('oxe: need to handle delete property');

type task = (path?: string) => Promise<any>;
type tasks = task[];

const $path = Symbol('$path');
const $task = Symbol('$task');
const $tasks = Symbol('$tasks');
const $proxy = Symbol('$proxy');

// const run = async function (tasks: tasks) {
//     let task;
//     while (task = tasks.shift()) {
//         await task();
//     }
// };

// const get = function (target, key) {
//     if (typeof target[ key ] === 'object' && target[ key ] !== null) {
//         return new Proxy(target[ key ], handler);
//     } else {
//         return target[ key ];
//     }
// };

const set = function (target: any, key: any, value: any) {
    if (key === $path) return true;
    if (key === $task) return true;
    // if (key === $tasks) return true;
    if (key === $proxy) return true;

    // console.log(target[ $path ] ? `${target[ $path ]}.${key}` : `${key}`);

    if (key === 'length') {
        target[ $task ](target[ $path ]);
        // target[ $tasks ].push(target[ $task ].bind(null, target[ $path ]));
        return true;
    }

    const current = target[ key ];
    if (current !== current && value !== value) return true; // NaN check
    // if (current === value && target[ $proxy ]) return true;
    if (current === value) return true;

    const path = target[ $path ] ? `${target[ $path ]}.${key}` : `${key}`;
    // const initial = !target[ $tasks ].length;

    if (value && typeof value === 'object') {
        // if (value && typeof value === 'object' && !value[ $proxy ]) {
        // target[ $tasks ].push(target[ $task ].bind(null, path));

        const clone = value.constructor();
        clone[ $path ] = path;
        clone[ $proxy ] = true;
        clone[ $task ] = target[ $task ];
        // clone[ $tasks ] = target[ $tasks ];
        const proxy = new Proxy(clone, handler);
        Object.assign(proxy, value);
        target[ key ] = proxy;

        // this does not work
        // const proxy = new Proxy(value, handler);
        // proxy[ $path ] = path;
        // proxy[ $proxy ] = true;
        // proxy[ $task ] = target[ $task ];
        // proxy[ $tasks ] = target[ $tasks ];
        // Object.assign(proxy, value);
        // target[ key ] = proxy;

    } else {
        // target[ $tasks ].push(target[ $task ].bind(null, path));
        target[ key ] = value;
    }

    target[ $task ](path);
    // if (initial) run(target[ $tasks ]);

    return true;
};

const handler = { set };

const observer = function (source: any, task: task) {

    const clone = source.constructor();
    clone[ $path ] = '';
    // clone[ $tasks ] = [];
    clone[ $task ] = task;
    clone[ $proxy ] = true;
    const proxy = new Proxy(clone, handler);
    Object.assign(proxy, source);
    return proxy;

    // source[ $path ] = '';
    // source[ $tasks ] = [];
    // source[ $task ] = task;
    // source[ $proxy ] = true;
    // const proxy = new Proxy(source, handler);
    // Object.assign(proxy, source);
    // return proxy;
};

export default observer;
