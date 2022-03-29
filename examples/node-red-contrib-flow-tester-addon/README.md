# node-red-flow-tester-addon

An Sample Addon to Flow Testing plugin for Node-RED

**This is under development and not ready for general use. If you want to contribute, come talk to us in the `#core-dev` channel on https://nodered.org/slack

## Developing

To use the development version of Flow Tester Addon you can clone its source code repository
and build it yourself.

1. Get the source code

```
git clone https://github.com/node-red/node-red-flow-tester-addon.git
```

2. Install the dependencies

```
cd node-red-flow-tester-addon
npm install
```

3. Build the plugin

```
npm run build
```

4. Install into Node-RED

```
cd ~/.node-red
npm install <path-to-node-red-flow-tester-addon-directory>
```

5. Restart Node-RED to load the plugin.

### Source code structure

 - `scripts` - build scripts used by `npm run build`
 - `src` - source code of the plugins
 - `test` - tests material

After `npm run build` is run, the following directories will be created:

 - `dist` - contains the built plugin files
 - `resources` contains the built plugin resource files (eg css)

## License

Copyright Node-RED Project Contributors.

Licensed under the [Apache License, Version 2.0](LICENSE).
