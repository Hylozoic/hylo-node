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
var _ = require('lodash')

var promisifyStream = stream => {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })
}

var UserImport = module.exports = {
  runWithRemoteCSV: function (url, options) {
    return promisifyStream(this.runWithCSVStream(request(url), options))
  },

  runWithCSVFile: function (filename, options) {
    return promisifyStream(this.runWithCSVStream(fs.createReadStream(filename), options))
  },

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

      if (options.dryRun) return

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
    },

    sustainableHuman: function (row) {
      var rawSkills = row['Skills']

      var skills = _.compact(rawSkills.split(/[,#\n]/).map(s => {
        if (!s) return
        return s.trim()
        .split(/(?=[A-Z])/g).map(w => w.toLowerCase()).join(' ')
        .replace(/- /g, '-')
        .replace(/ ([a-z])\b/g, '$1')
        .replace(/ {2,}/g, ' ')
      }))

      var attrs = _.pickBy({
        name: `${row['Name First']} ${row['Name Last']}`,
        email: row['Email'],
        bio: row['Short Bio (175 char)'],
        intention: row['Intention'],
        extra_info: row['Personal Website'],
        facebook_url: row['Facebook URL'],
        twitter_name: row['Twitter URL'].replace(/.*twitter.com\/@?/, ''),
        linkedin_url: row['Linked In URL'],
        skills
      })

      // console.log(`${attrs.name}: ${skills.join(' _ ')}`)
      return attrs
    }
  }
}

if (require.main === module) {
  var skiff = require('../../lib/skiff')
  skiff.lift({
    log: {
      level: 'warn'
    },
    start: () => {
      UserImport.runWithCSVFile('../sustainablehuman.csv', {
        convert: 'sustainableHuman',
        dryRun: true
      })
      .then(() => skiff.lower())
    }
  })
}
