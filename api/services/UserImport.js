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
var validator = require('validator')

module.exports = {
  createUser: function (row, options) {
    var attrs = _.omit(row, 'skills', 'organizations')

    if (!validator.isEmail(attrs.email)) {
      console.error('invalid email for ' + row.name)
      return
    }

    return User.isEmailUnique(attrs.email)
    .then(unique => {
      if (!unique) {
        console.error('email already exists: ' + attrs.email)
        return
      }

      return User.create(_.merge(attrs, {
        community: options.community,
        settings: {
          digest_frequency: 'weekly',
          receives_email_prompts: true
        }
      }))
      .then(user => {
        var promises = []

        if (row.skills) {
          promises.push(Skill.update(row.skills, user.id))
        }

        if (row.organizations) {
          promises.push(Organization.update(row.organizations, user.id))
        }

        return Promise.all(promises)
      })
    })
  },

  runWithRemoteCSV: function (url, options) {
    return this.runWithCSVStream(request(url), options)
  },

  runWithCSVFile: function (filename, options) {
    return this.runWithCSVStream(fs.createReadStream(filename), options)
  },

  runWithCSVStream: function (stream, options) {
    var self = this
    var convert

    // you can pass a function that maps from arbitrary values
    // to the field names that the User model expects
    if (!options.convert) {
      convert = row => row
    } else if (typeof options.convert === 'string') {
      convert = this.converters[options.convert]
    } else {
      convert = options.convert
    }

    return stream.pipe(csv({headers: options.headers}))
    .on('data', row => self.createUser(convert(row), options))
  },

  converters: {
    idin: function (row) {
      return {
        name: format('%s %s', row['First Name'], row['Last Name']),
        email: row['Email'],
        skills: _.compact(row['Areas of Expertise'].split(/; ?/)),
        organizations: _.compact(row['Organization'].split(/; ?/))
          .concat(row['IDDS Attended'].split(/; ?/))
          .concat(row['Country of Residence']),
        bio: row['Biography'],
        work: row['Current Projects']
      }
    }
  }

}
