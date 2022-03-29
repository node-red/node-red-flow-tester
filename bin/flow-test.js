#!/usr/bin/env node
'use strict'

const nopt = require("nopt");
const got = require("got");

function parseArgs(args) {
    const knownOpts = {
        target: String,
        list: Boolean,
        run: String
    };
    const shortHands = {
        't': ["--target"],
        'l': ["--list"],
        'r': ["--run"],
        'j': ["--json"],
    };
    return nopt(knownOpts, shortHands, args, 2);
}


async function getList(target) {
    const url = `${target}/flow-tester/testCase`;
    try {
        const res = await got(url);
        const body = JSON.parse(res.body);
        return body;
    }
    catch (err) {
        console.log(err);
    }
}

async function doList(target, jsonOutput) {
    const list = await getList(target);
    if (jsonOutput) {
        console.log(JSON.stringify(list, undefined, "\t"));
        return;
    }
    let id = 0;
    list.forEach((tcase) => {
        console.log(`${tcase.name}`);
        const tests = tcase.tests;
        tests.forEach((test) => {
            console.log(`  ${id}: ${test.name}`);
            id++;
        });
    });
}

async function doRun(target, no) {
    try {
        const cases = await getList(target);
        let id = 0;
        for (let tcase of cases) {
            const tests = tcase.tests;
            for (let test of tests) {
                if (id === no) {
                    const url = `${target}/flow-tester/runTestCase/${tcase.id}/${test.id}`;
                    const res = await got(url);
                    const body = JSON.parse(res.body);
                    return body;
                }
                id++;
            }
        }
    }
    catch (err) {
        console.log(err);
        return undefined;
    }
}

async function main(args) {
    const opts = parseArgs(args);
    let target = "http://localhost:1880";
    if (opts.target) {
        target = opts.target;
    }
    if (opts.list) {
        await doList(target, opts.json);
    }
    if (opts.run) {
        const res = await doRun(target, Number(opts.run));
        console.log(JSON.stringify(res, null, "\t"));
    }
}


(async () => {
    main(process.argv);
})();
