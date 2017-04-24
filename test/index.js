var root = require('root-path')
var glob = require('glob')
glob.sync('test/{unit,api}/**/*.test.js').forEach(file => 
  require(root(file.replace(/\.js$/, ''))))
