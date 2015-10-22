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

module.exports = {
  createUser: function (row, options) {
    return User.create(_.merge(row, {
      community: options.community,
      settings: {
        digest_frequency: 'weekly',
        email_solicitation_preference: true
      }
    }))
  },

  runWithRemoteCSV: function (url, options) {
    return this.runWithCSVStream(request(url), options)
  },

  runWithCSVFile: function (filename, options) {
    return this.runWithCSVStream(fs.createReadStream(filename), options)
  },

  runWithCSVStream: function (stream, options) {
    var self = this
    return stream.pipe(csv({headers: options.headers}))
    .on('data', row => self.createUser(row, options))
  }

}
