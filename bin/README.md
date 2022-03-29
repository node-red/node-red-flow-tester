Simple command line tool for runnning test cases. 

1. listing list of test cases

```
% node flow-test.js [--list|-l] [[--target|-t] URL]
```

show list of test cases on Node-RED instance specified by *URL*.

Example:
```
% node bin/flow-test.js --list
Sample - Global
  0: test click
  1: test send
  2: test wait
  3: test function
```

2. running a test case

```
% node flow-test.js [--run|-r] no [[--target|-t] URL]
```

run the test case specified by *no* on Node-RED instance specified by *URL*.
