/*
  example usage for a CSV with no header row and columns for name, email, & image:

  UserImport.runWithCSVFile('test.csv', {
    headers: ['name', 'email', 'avatar_url'],
    community: {id: 1}
  })
*/

var request = require('request')
var fs = require('fs')
var csv = require('csv-parser')

var createUser = function (row, options) {
  return User.create(_.merge(row, {community: options.community}))
}

module.exports = {
  runWithRemoteCSV: function (url, options) {
    return this.runWithCSVStream(request(url), options)
  },

  runWithCSVFile: function (filename, options) {
    return this.runWithCSVStream(fs.createReadStream(filename), options)
  },

  runWithCSVStream: function (stream, options) {
    return stream.pipe(csv({headers: options.headers}))
    .on('data', row => createUser(row, options))
  }
}
