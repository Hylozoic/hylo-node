var root = require('root-path')
var glob = require('glob')
glob.sync('{api,lib,test}/**/*.test.js').forEach(file =>
  require(root(file.replace(/\.js$/, ''))))
