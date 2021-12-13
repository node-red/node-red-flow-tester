module.exports = (RED) => {
    "use strict";

    const vm = require("vm");
    const assert = require("assert");
    const promisify = require("util").promisify;

    let maxActions = 0;      // max number of actions 
    let actionCount = 0;     // currently executed actions count

    let numberOfChecks = 0;  // number of checks in current test case
    let successActions = []; // info. of successful actions
    let failActions = [];    // info. of failed actions

    let resolveWait = (() => {});  // resolve function for wait promise
    let currentWait = null;  // handle for wait action
    const TIMEOUT = 10;      // timeout period of flow execution

    // actions map: event name -> node id -> action info
    const actionMap = {
        setup: [],		// executed on test start 
        cleanup: [],	// executed on test end

        recv: [],		// executed on message receive
        stub: [],		// executed on message receive to make
                        // stubbed execution of target node
        send: [],		// executed on message send
    };

    var addonList = [];

    /**
     *  Add event log to editor sidebar log area
     *  @param {string} msg - message to be added
     */
    function log(msg) {
        RED.comms.publish("flow-test:log", msg);
    }

    /**
     *  Show notification on editor
     *  @param {string} msg - message to be shown
    */
    function notify(msg) {
        RED.comms.publish("flow-test:notify", msg);
    }

    /**
     *  Notify that execution reached the maxnimum number
     */
    function reportMaxActions() {
        RED.comms.publish("flow-test:maxActions", {});
    }

    /**
     *  Notify result of match action
     *  @param {Object} result - result information object with:
     *                             result: true/false
     *                             suiteID: test suite id
     *                             testID: test case id
     */
    function sendMatchResult(result) {
        RED.comms.publish("flow-test:match-result", result);
    }

    /**
     *  Execute send action: send value to target node
     *  @param {string} target - target node id
     *  @param {any} value - payload value
     *  @returns {Promise}
     */
    function executeSend(target, value) {
        log(`send: ${JSON.stringify(value)} to ${target}`);
        const node = RED.nodes.getNode(target);
        node.receive({
            payload: value
        });
        return Promise.resolve(true);
    }

    /**
     *  Execute click action: click button of target node
     *  @param {string} target - target node id
     *  @returns {Promise}
     */
    function executeClick(target) {
        log(`click: ${target}`);
        RED.comms.publish("flow-test:click", target);
        return Promise.resolve(true);
    }

    /**
     *  Execute log action: log message
     *  @param {string} value - logged string 
     *  @returns {Promise}
     */
    function executeLog(value) {
        log(`log: ${value}`);
        RED.log.info(value);
        return Promise.resolve(true);
    }

    /**
     *  Execute set action: set value to msg, flow context, or global context
     *  @param {Object} dst - destination location (type, value)
     *  @param {Object} src - source value (type, value)
     *  @param {string} nid - target node id
     *  @param {Object} msg - target message
     *  @returns {Promise}
     */
    function executeSet(dst, src, nid, msg) {
        log(`set: ${dst.type}.${dst.value} = ${JSON.stringify(src.value)}`);
        const node = nid ? RED.nodes.getNode(nid) : null;
        let val = src.value || "";
        switch (src.type) {
        case "str":
            break;
        case "num":
            val = Number(val);
            break;
        case "bool":
            val = ((val === true) || (val === "true"));
            break;
        case "json":
            val = JSON.parse(val);
            break;
        case "bin":
            val = Buffer.from(JSON.parse(val));
            break;
        case "re":
            break;
        case "date":
            val = Date.now();
            break;
        case "jsonata":
            if (!src.exp) {
                src.exp = RED.util.prepareJSONataExpression(val, node);
            }
            val = RED.util.evaluateJSONataExpression(src.exp, msg);
            break;
        case "env":
            val = RED.util.evaluateNodeProperty(val, "env", node);
            break;
        }
        switch (dst.type) {
        case "msg":
            if (msg) {
                RED.util.setMessageProperty(msg, dst.value, value);
            }
            break;
        case "global":
        case "flow":
            const contextKey = RED.util.parseContextStore(dst.value);
            if (/\[msg/.test(contextKey.key)) {
                // The key has a nest msg. reference to evaluate first
                contextKey.key = RED.util.normalisePropertyExpression(contextKey.key, msg, true)
            }
            const target = node.context()[dst.type];
            const set = promisify(target.set);
            return set(contextKey.key, val, contextKey.store);
        default:
            throw new Error("unexpected value type: "+src.type);
        }
        return Promise.resolve(true);
    }

    /**
     *  Report result of validation 
     *  @param {boolean} result - result of validation
     *  @param {Number} index - index in actions list
     *  @param {string} sid - test suite id
     *  @param {string} tid - test case id
     */
    function reportResult(result, index, sid, tid) {
        const info = {
            result: result,
            suiteID: sid,
            testID: tid,
        };
        var actInfo = {
            index: index,
            suiteID: sid,
            testID: tid,
        };
        if (result) {
            successActions.push(actInfo);
        }
        else {
            failActions.push(actInfo);
        }
        sendMatchResult(info);
        if ((successActions.length +failActions.length) >= numberOfChecks) {
            if (currentWait) {
                // clear timeout if all validations processed
                clearTimeout(currentWait);
            }
            resolveWait(true);
            resolveWait = (()=>{});
        }
    }

    /**
     *  Execute match action: validates message value
     *  @param {any} val - expected value 
     *  @param {Object} msg - message to be checked
     *  @param {Number} index - index in actions list
     *  @param {string} sid - test suite id
     *  @param {string} tid - test case id
     *  @returns {Promise}
     */
    function executeMatch(val, msg, index, sid, tid) {
        log(`match: ${val}`);
        let result = true;
        try {
            assert.deepEqual(val, msg.payload);
        }
        catch (e) {
            result = false;
        }
        reportResult(result, index, sid, tid);
        return Promise.resolve(true);
    }

    /**
     *  Execute wait action: wait for specified period
     *  @param {Number} wait - wait period in ms
     *  @returns {Promise}
     */
    function executeWait(wait) {
        log(`wait: ${wait}`);
        return new Promise((resolve) => {
            resolveWait = resolve;
            currentWait = setTimeout(function () {
                currentWait = null;
                resolve(true);
            }, wait);
        });
    }

    /**
     *  Execute function action: execute JavaScript code
     *  @param {string} code - JavaScript code text
     *  @param {boolean} performCheck - true if the code performs check
     *  @param {string} nid - target node id  
     *  @param {Object} msg - message
     *  @param {Number} index - index in actions list
     *  @param {string} sid - test suid id
     *  @param {string} tid - test case id
     *  @returns {Promise}
     */
    function executeFunction(code, performCheck, nid, msg,
                             index, sid, tid) {
        log(`function: ${code}`);
        const node = nid ? RED.nodes.getNode(nid) : null;
        const ctxDef = {
            console: console,
            node: node,
            msg: msg
        };
        if (performCheck) {
            // `check` function for validation 
            ctxDef.check = ((result) => {
                reportResult(result, index, sid, tid);
            });
        }
        const ctx = vm.createContext(ctxDef);
        const script = `
(function () {
    try {
        ${code};
    }
    catch (e) {
        return Promise.reject(e);
    }
    return Promise.resolve(true);
})()`;
        return vm.runInContext(script, ctx);
    }

    /**
     *  Find addon action definition 
     *  @param {string} name - name of action
     *  @returns {Object} action definition
     */
    function findAddonAction(name) {
        for (let addon of addonList) {
            for (let def of addon.actions()) {
                if (def.name === name) {
                    return def;
                }
            }
        }
        return null;
    }

    /**
     *  Execute action
     *  @param {Object} action - action description object
     *  @param {Object} node - target node
     *  @param {Object} msg - message
     *  @returns {Promise}
     */
    function executeAction(action, node, msg) {
        actionCount++;
        if (actionCount >= maxActions) {
            reportMaxActions();
            throw new Error("action count exceeded limit");
        }
        try {
            switch (action.kind) {
            case "send":
                return executeSend(action.target, action.value);
            case "click":
                return executeClick(action.target);
            case "log":
                return executeLog(action.value);
            case "set":
                return executeSet(action.dst, action.src, node, msg);
            case "match":
                return executeMatch(action.value, msg,
                                    action.index, action.suiteID, action.testID);
            case "wait":
                return executeWait(action.wait);
            case "function":
                return executeFunction(action.code, action.performCheck,
                                       node, msg,
                                       action.index, action.suiteID, action.testID);
            default:
                const addon = findAddonAction(action.kind);
                if (addon) {
                    return executeAddonAction(addon, action, node, msg);
                }
                else {
                    return Promise.reject(new Error("unexpected kind of action: " +action.kind));
                }
            }
        }
        catch (e) {
            const msg = "error: "+ e;
            log(msg);
            console.log(msg);
        }
        return Promise.resolve(true);
    }

    /**
     *  Process actions defined for event
     *  @param {array} actions - array of actions
     *  @param {Object} node - target node
     *  @param {Object} msg - message
     *  @returns {Promise}
     */
    function processEvent(actions, node, msg) {
        let promise = Promise.resolve(true);
        if (actions) {
            for (let action of actions) {
                promise = promise.then(() => 
                    executeAction(action, node, msg)
                );
            }
        }
        return promise;
    }

    /**
     *  Clear hooks and actions map 
     */
    function clearActions() {
        RED.hooks.remove("onReceive.flow-test");
        RED.hooks.remove("preRoute.flow-test");
        RED.hooks.remove("onSend.flow-test");

        actionMap.setup = [];
        actionMap.cleanup = [];

        actionMap.recv = [];
        actionMap.stub = [];
        actionMap.send = [];
    }

    /**
     *  Initialize flow testing plugin
     *  @returns {Promise}
     */
    function init() {
        if (currentWait) {
            clearTimeout(currentWait);
        }
        clearActions();

        // register hook for recv event
        RED.hooks.add("onReceive.flow-test", (event, done) => {
            const dst = event.destination.id;
            const actions = actionMap.recv[dst];

            if (actions) {
                const msg = event.msg;
                const promise = processEvent(actions, dst, msg);
                promise.then(() => {
                    done();
                }).catch((err) => {
                    log(err.toString());
                    done();
                });
            }
            else {
                done();
            }
        });

        // register hook for stub event
        RED.hooks.add("preRoute.flow-test", (event, done) => {
            const src = event.source.id;
            const actions = actionMap.stub[src];

            if (actions)  {
                const msg = event.msg;
                const promise = processEvent(actions, src, msg);
                promise.then(() => {
                    done(false);
                }).catch((err) => {
                    log(err);
                    done(false);
                });
            }
            else {
                done();
            }
        });

        // register hook for send event
        RED.hooks.add("onSend.flow-test", (events, done) => {
            let promise = Promise.resolve();
            for (let event of events) {
                const src = event.source.id;
                const msg = event.msg;
                const actions = actionMap.send[src];

                if (actions) {
                    promise = promise.then(() => {
                        return processEvent(actions, src, msg);
                    });
                };
            }
            promise.then(() => {
                done();
            }).catch((err) => {
                log(err);
                done(false);
            });
        });


        return Promise.resolve(true);
    }


    /**
     *  Register actions to actionMap
     *  @param {string} event - event name
     *  @param {array} actions - list of actions
     *  @param {string} sid - test suite id
     *  @param {string} tid - test case id
     *  @returns {Promise}
     */
    function registerActions(event, actions, sid, tid) {
        switch (event) {
        case "setup":
        case "cleanup":
        case "recv":
        case "stub":
        case "send":
            Object.entries(actions).forEach(([node, acts]) => {
                if (acts.length > 0) {
                    actionMap[event][node] = acts;
                    let i = 0;
                    acts.forEach((act) => {
                        act.index = i;
                        act.suiteID = sid;
                        act.testID = tid;
                        i++;
                    });
                }
            });
            break;
        default:
            throw new Error("unexpected event: " +event);
        }
        return Promise.resolve(true);
    }

    /**
     *  Initialize & process actions for setup event
     *  @param {Number} maxActs - max number of actions
     *  @returns {Promise}
     */
    function setup(maxActs) {
        maxActions = maxActs;
        actionCount = 0;
        successActions = [];
        failActions = [];
        // execute global actions first
        const actions = actionMap.setup["_global_"];
        let promise = processEvent(actions, null, null);
        // then, execute nodes events
        for (let id of Object.keys(actionMap.setup)) {
            if (id !== "_global_") {
                const actions = actionMap.setup[id];
                promise = promise.then(() => {
                    const node = RED.nodes.getNode(id);
                    return processEvent(actions, node, null);
                });
            }
        }
        return promise;
    }


    /**
     *  Process actions for cleanup event
     *  @param {Number} maxActs - max number of actions
     *  @returns {Promise}
     */
    function cleanup() {
        // execute global actions first
        const actions = actionMap.cleanup["_global_"];
        let promise = processEvent(actions, null, null);
        // then, execute nodes events
        for (let id of Object.keys(actionMap.setup)) {
            if (id !== "_global_") {
                const actions = actionMap.cleanup[id];
                promise = promise.then(() => {
                    const node = RED.nodes.getNode(id);
                    return processEvent(actions, node, null);
                });
            }
        }
        // finally, clear actions
        return promise.then(() => {
            clearActions();
        });
    }

    function registerAddon(addon) {
        addonList.push(addon);
    }

    function executeAddonAction(addon, action, node, msg) {
        const exec = addon.execute;
        const report = action.performCheck;
        const index = action.index;
        const sid = action.suiteID;
        const tid = action.testID;;
        if (exec) {
            try {
                return exec({
                    action: action,
                    node: node,
                    msg: msg
                }).then(() => {
                    if (report) {
                        reportResult(true, index, sid, tid);
                    }
                }).catch(() => {
                    if (report) {
                        reportResult(false, index, sid, tid);
                    }
                });;
            }
            catch (e) {
                const msg = "error:"+ e;
                log(msg);
                console.log(msg);
                if (report) {
                    reportResult(false, index, sid, tid);
                }
                return Promise.reject();
            }
        };
        return Promise.resolve();
    }

    // Register flow testing plugin
    RED.plugins.registerPlugin('node-red-flow-tester', {
        settings: {
            "*": { exportable: true }
        },
        onadd: () => {
            const routeAuthHandler = RED.auth.needsPermission("flow-tester.write");

            var plugins = RED.plugins.getByType('flow-tester-addon');
            plugins.forEach(function(plugin) {
                registerAddon(plugin);
            })
            RED.events.on("registry:plugin-added", function (id) {
                var plugin = RED.plugins.get(id);
                if (plugin.type === "flow-tester-addon") {
                    registerAddon(plugin);
                }
            });
            

            // Internal APIs for flow testing
            RED.httpAdmin.post(
                "/flow-tester/executeAction/:action",
                routeAuthHandler,
                (req, res) => {
                    try {
                        const kind = req.params.action;
                        const opt = req.body;
                        let promise = Promise.resolve(true);
                        switch (kind) {
                        case "init":
                            // initialize runtime part of flow-tester plugin
                            promise = init();
                            break;
                        case "registerActions":
                            promise = registerActions(opt.event, opt.actions, opt.suiteID, opt.testID);
                            break;
                        case "setup":
                            promise = setup(opt.maxActions);
                            break;
                        case "cleanup":
                            // cleanup runtime part of flow-tester plugin
                            promise = cleanup();
                            break;
                        case "send":
                            // send a message to specified node
                            promise = executeSend(opt.target, opt.value);
                            break;
                        case "click":
                            // click the button of target node
                            // nothing to do
                            break;
                        case "log":
                            // log message
                            promise = executeLog(opt.value);
                            break;
                        case "set":
                            // set context or environment variable
                            promise = executeSet(opt.dst, opt.src);
                            break;
                        case "wait":
                            // wait for specified time
                            promise = executeWait(opt.wait);
                            break;
                        case "function":
                            // execute JavaScript code
                            promise = executeFunction(opt.code);
                            break;
                        default:
                            const addon = findAddonAction(action.kind);
                            if (addon) {
                                promise = executeAddonAction(addon, action, node, msg);
                            }
                            else {
                                console.log("unexpected action kind: ", kind);
                            }
                            break;
                        }
                        promise.then((result) => {
                            res.json(result || {});
                        }).catch((err) => {
                            const msg = "error: " +err;
                            console.log(msg);
                            notify(msg);
                            res.sendStatus(400);
                        });
                    }
                    catch (e) {
                        console.log(e.stack);
                        res.sendStatus(400);
                    }
                });

            // API for getting list of test cases
            RED.httpAdmin.get(
                "/flow-tester/testCase",
                routeAuthHandler,
                (req, res) => {
                    const suiteList = [];
                    const nodes = [];
                    RED.nodes.eachNode((node) => {
                        if (node.type === "flow-test-config") {
                            nodes.push(node);
                        }
                    });
                    nodes.forEach((node) => {
                        const testList = [];
                        const suite = {
                            id: node.id,
                            name: node.name,
                            tests: testList
                        };
                        suiteList.push(suite);
                        const cases = node.tests;
                        cases.forEach((testCase) => {
                            const test = {
                                id: testCase.id,
                                name: testCase.name
                            };
                            testList.push(test);
                        });
                    });
                    res.json(suiteList);
                }
            );

            /**
             *  Find test information for specified ids
             *  @param {Object} suite - test suite information
             *  @param {string} tid - test case id
             *  @returns {Object} test information
             */
            function findTest(suite, tid) {
                if (suite) {
                    const tests = suite.tests;
                    const test = tests.find((t) => {
                        return (t.id === tid);
                    });
                    if (test) {
                        return test;
                    }
                }
                return null;
            }

            /**
             *  Register actions for a test case
             *  @param {Object} suite - test suite information
             *  @param {Object} test - test case information
             *  @returns {Promise}
             */
            function registerTestActions(suite, test) {
                log("Running test: " +test.name);
                const sid = suite.id;
                const tid = test.id;
                let promise = Promise.resolve();
                const actions = test.actions;
                var events = Object.keys(actions);
                events.forEach(function (event) {
                    promise = promise.then(() => {
                        return registerActions(event,
                                               actions[event],
                                               sid, tid);
                    });
                });
                return promise;
            }

            /**
             *  Count number of expected checks for test case
             *  @param {Object} map - action definition
             *  @returns {Number} number of checks
             */
            function countNumberOfChecks(map) {
                var count = 0;
                var events = Object.keys(map);
                events.forEach(function (event) {
                    var evMap = map[event];
                    var nodes = Object.keys(evMap);
                    nodes.forEach(function (node) {
                        var acts = evMap[node];
                        acts.forEach(function (act) {
                            if (act.performCheck) {
                                count++;
                            }
                        });
                    });
                });     
                return count;
            }

            function clearMatchResults() {
                RED.comms.publish("flow-test:clear-match-result", {});
            }

            // API for executing a test case
            RED.httpAdmin.get(
                "/flow-tester/runTestCase/:suite/:test",
                routeAuthHandler,
                (req, res) => {
                    const params = req.params;
                    const sid = params.suite;
                    const tid = params.test;
                    const suite = RED.nodes.getNode(sid);
                    const test = findTest(suite, tid);
                    
                    numberOfChecks = countNumberOfChecks(test.actions);
                    clearMatchResults();

                    if (test) {
                        init().then(() => {
                            return registerTestActions(suite, test);
                        }).then(() => {
                            return setup(suite.maxActions)
                        }).then(() => {
                            var timeout = (test.timeout || TIMEOUT) *1000;
                            return executeWait(timeout);
                        }).then(() => {
                            return cleanup(); 
                        }).then(() => {
                            const result = {
                                result: {
                                    all: numberOfChecks,
                                    success: successActions.length,
                                    fail: failActions.length
                                },
                                info: {
                                    success: successActions,
                                    fail: failActions
                                }
                            };
                            res.json(result);
                        }).catch((err) => {
                            const msg = "error: " +err;
                            console.log(msg);
                            res.sendStatus(400);
                        });
                        return;
                    }
                    res.sendStatus(400);
                }
            );

        },
        onremove: () => {
        }
    });
};
