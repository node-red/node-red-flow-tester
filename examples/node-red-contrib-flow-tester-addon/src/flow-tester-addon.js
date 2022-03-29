module.exports = (RED) => {
    "use strict";

    console.log("; Initialize flow tester addon");
    RED.plugins.registerPlugin('node-red-flow-tester-addon', {
        type: "flow-tester-addon",
        actions: function () {
            return [
                {
                    name: "addon:example1",
                    onTestStart: function () {
                        let promise = Promise.resolve();
                        promise = promise.then(() => {
                            console.log("; start: addon:example1");
                        });
                        return promise;
                    },
                    onTestEnd: function () {
                        let promise = Promise.resolve();
                        promise = promise.then(() => {
                            console.log("; end: addon:example1");
                        });
                        return promise;
                    },
                    execute: function(opt) {
                        // opt object contains:
                        // - data: optional data for action
                        // - node: target node
                        // - msg: message object
                        return new Promise((resolve, reject) => {
                            const action = opt.action;
                            console.log(action.value);
                            resolve();
                        });
                    }
                },
                {
                    name: "addon:example2",
                    execute: function(opt) {
                        return new Promise((resolve, reject) => {
                            const msg = opt.msg;
                            const payload = msg.payload;
                            if (payload) {
                                try {
                                    const action = opt.action;
                                    const rex = new RegExp(action.value);
                                    if (rex.test(payload)) {
                                        resolve();
                                    }
                                }
                                catch (e) {
                                    console.log("error:", e);
                                }
                            }
                            reject();
                        });
                    }
                }
            ];
        }
    });
};
