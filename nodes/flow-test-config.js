module.exports = function(RED) {
    "use strict";

    function FlowTestConfig(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        node.name = n.name;
    }
    
    RED.nodes.registerType("flow-test-config", FlowTestConfig);
};
