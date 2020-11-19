const root = require("root-path");
const glob = require("glob");
glob
  .sync("{api,lib,test}/**/*.test.js")
  .forEach((file) => require(root(file.replace(/\.js$/, ""))));
