var root = require('root-path')
var glob = require('glob')
glob.sync('test/unit/**/*.test.js').forEach(file => 
  require(root(file.replace(/\.js$/, ''))))
