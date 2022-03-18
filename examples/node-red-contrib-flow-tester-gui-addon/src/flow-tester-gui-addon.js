module.exports = (RED) => {
    "use strict";

    // WebDriver object
    const { remote } = require('webdriverio');
    const promisify = require("util").promisify;


    // Browser instance
    var browser_instances = [];

    // Get a browser instance
    async function getBrowser(target) {
        let key = "_default";
        if (target) {
            key = target;
        } 
        let browser = browser_instances[key] || null;
        if (!browser) {
            browser = await remote({
                capabilities: {
                    browserName: 'chrome'
                }
            })
            browser_instances[key] = browser;
        }
        return browser; 
    }

    async function testClose(){ 
        for (let key in browser_instances) {
            let browser = browser_instances[key];
            await browser.deleteSession();
            delete browser_instances[key];
        }
    }

    function testClear(){ 
        for (let key in browser_instances) {
            delete browser_instances[key];
        }
    }

    console.log("; Initialize flow tester gui addon");
    RED.plugins.registerPlugin('node-red-flow-tester-gui-addon', {
        type: "flow-tester-addon",
        actions: function () {
            return [
                {
                    name: "addon:GUI-URL",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            // Close all browser instances after test
                            ;(async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                    //reject(err.message);
                                }
                            })()
                        })
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            // Perform an operation on an object with the specified instance name
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    if (action.size) {
                                        const size = action.size.split(',');
                                        await browser.setWindowSize(Number(size[0]),Number(size[1]));
                                    }
                                    await browser.url(action.url);
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    },
                },
                {
                    name: "addon:GUI-Keys",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    if (action.key) {
                                        const keys = action.key.split(',');
                                        await browser.keys(keys);
                                    }
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-saveScreenshot",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    if (action.url) {
                                        // Optional: Open the specified URL
                                        await browser.url(action.url)
                                    }
                                    await browser.saveScreenshot(action.filepath);
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-setCookies",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    const cookies = JSON.parse(action.cookie);
                                    await browser.setCookies(cookies);
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-setTimeout",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    const timeout = JSON.parse(action.timeout);
                                    await browser.setTimeout(timeout);
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-waitUntil",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            let  timeout = Number(action.timeout);
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    await browser.waitUntil(
                                        async () => (
                                            action.type === "str" && (await browser.$(action.selector).getText() === action.value) || 
                                            action.type === "re"  && (new RegExp(action.value).test(await browser.$(action.selector).getText()))),
                                        {
                                            //timeout: Number(action.timeout),
                                            timeout: timeout,
                                            timeoutMsg: 'expected text to be different after ' + action.timeout + "ms"
                                        }
                                    );
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-addValue",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    await browser.$(action.selector).addValue(action.value);
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-clearValue",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    await browser.$(action.selector).clearValue();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-click",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    if (action.clickkind === 'single') {
                                        await browser.$(action.selector).click();
                                    } else {
                                        await browser.$(action.selector).doubleClick();
                                    }
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-getValue",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object

                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            const nid = opt.node;
                            const msg = opt.msg;
                            const node = nid ? RED.nodes.getNode(nid) : null;
                            let val = ""
                            if (!node) {
                                console.log("Must be run in a node instance test.");
                                reject("Must be run in a node instance test.");
                                return;
                            }

                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    if (action.getkind === 'attr') {
                                        val = await browser.$(action.selector).getAttribute(action.getname);
                                    } else if (action.getkind === 'prop') {
                                        val = await browser.$(action.selector).getProperty(action.getname);
                                    } else if (action.getkind === 'tag') {
                                        val = await browser.$(action.selector).getTagName();
                                    } else if (action.getkind === 'text') {
                                        val = await browser.$(action.selector).getText();
                                    } else if (action.getkind === 'val') {
                                        val = await browser.$(action.selector).getValue();
                                    }

                                    switch (action.type) {
                                        //case "msg":
                                        //    if (msg) {
                                        //        RED.util.setMessageProperty(msg, action.value, value);
                                        //    }
                                        //    break;
                                        case "global":
                                        case "flow":
                                            const contextKey = RED.util.parseContextStore(action.value);
                                            if (/\[msg/.test(contextKey.key)) {
                                                // The key has a nest msg. reference to evaluate first
                                                contextKey.key = RED.util.normalisePropertyExpression(contextKey.key, msg, true)
                                            }
                                            const target = node.context()[action.type];
                                            const set = promisify(target.set);
                                            set(contextKey.key, val, contextKey.store);
                                            break;
                                        default:
                                            console.log("unexpected value type: "+ action.type);
                                            reject("unexpected value type: "+ action.type);
                                    }
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-moveTo",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    await browser.$(action.selector).moveTo();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                },
                {
                    name: "addon:GUI-setValue",
                    onTestStart: function(opt) {
                        return new Promise((resolve, reject) => {
                            testClear();
                            resolve();
                        });
                    },
                    onTestEnd: function(opt) {
                        return new Promise((resolve, reject) => {
                            (async () => {
                                try {
                                    await testClose();
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    resolve();
                                }
                            })()
                        });
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            (async () => {
                                try {
                                    const browser = await getBrowser(action.target);
                                    await browser.$(action.selector).setValue(action.value);
                                    resolve();
                                }catch(err){
                                    console.log(err);
                                    reject(err.message);
                                }
                            })()
                        });
                    }
                }
            ];
        }
    });
};
