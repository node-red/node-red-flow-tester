module.exports = (RED) => {
    RED.plugins.registerPlugin('node-red-flow-tester', {
        settings: {
            "*": { exportable: true }
        }
    });
};
