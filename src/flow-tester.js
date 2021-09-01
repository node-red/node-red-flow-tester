module.exports = (RED) => {

    let checks = [];
    let checkSend = {};

    function message(msg) {
        RED.comms.publish("flow-test:notify", msg);
    }
    
    function init() {
        checks = [];
        checkSend = {};

        RED.hooks.add("onSend.flow-test", (events, done) => {
            events.forEach((event) => {
                const src = event.source;
                const msg = event.msg;
                const sendCB = checkSend[src.id];
                if (sendCB) {
                    sendCB(msg);
                }
            });
            done();
        });
        return Promise.resolve(true);
    }

    function start() {
        Promise.all(checks).then((results) => {
            if (results.find(v => (v !== true)) === undefined) {
                message("test success");
            }
            else {
                message("test failed");
            }
        }).catch((e) => {
            message("test failed");
        });
        return Promise.resolve(true);
    }
    
    function cleanup() {
        RED.hooks.remove("onSend.flow-test");
        return Promise.resolve(true);
    }

    function executeSend(target, value) {
        const node = RED.nodes.getNode(target);
        node.receive({
            payload: value
        });
        return Promise.resolve(true);
    }

    function initMatch(nid, value) {
        console.log("; initMatch: ", nid, value);
        let resolve = null;
        let reject = null;
        const promise = new Promise((resolve_, reject_) => {
            resolve = resolve_;
            reject = reject_;
        });
        checkSend[nid] = (msg) => {
            if (msg && (msg.payload === value)) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        };
        checks.push(promise);
        return Promise.resolve(true);
    }

    RED.plugins.registerPlugin('node-red-flow-tester', {
        settings: {
            "*": { exportable: true }
        },
        onadd: () => {
            const routeAuthHandler = RED.auth.needsPermission("flow-tester.write");
            RED.httpAdmin.post(
                "/flow-tester/executeAction/:action",
                routeAuthHandler,
                (req, res) => {
                    const kind = req.params.action;
                    const opt = req.body;
                    let promise = Promise.resolve(null);
                    switch (kind) {
                    case "init":
                        promise = init();
                        break;
                    case "start":
                        promise = start();
                        break;
                    case "cleanup":
                        promise = cleanup();
                        break;
                    case "send":
                        promise = executeSend(opt.target, opt.value);
                        break;
                    case "matchInit":
                        promise = initMatch(opt.node, opt.value);
                        break;
                    case "press":
                    case "match":
                    case "recv":
                    case "set": 
                    case "wait":
                    case "function":
                    default:
                        console.log("unexpected action kind: ", kind);
                        break;
                    }
                    promise.then((result) => {
                        res.json(result);
                    }).catch((err) => {
                        res.sendStatus(400);
                    });
                });
        }
    });

};
