/*
  example usage for a remote CSV with no header row and columns for name, email,
  & image:

  UserImport.import({
    url: 'http://foo.com/test.csv',
    headers: ['name', 'email', 'avatar_url'],
    community: {id: 1}
  })

*/

const request = require('request')
const fs = require('fs')
const csv = require('csv-parser')
const validator = require('validator')
const _ = require('lodash')

const promisifyStream = stream => {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })
}

const getStream = options => {
  return options.url
    ? request(options.url)
    : fs.createReadStream(options.filename)
}

const getConverter = convert => {
  // you can pass a function that maps from arbitrary values
  // to the field names that the User model expects
  if (!convert) {
    return row => row
  } else if (typeof convert === 'string') {
    return UserImport.converters[convert]
  } else {
    return convert
  }
}

const runWithCSVStream = function (stream, options, rowAction) {
  stream.pipe(csv({headers: options.headers})).on('data', rowAction)
  return promisifyStream(stream)
}

const createUser = function (row, options) {
  if (!row) return

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
}

const converters = {
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

const operations = {
  sustainableHumanIntentions: function (row, options) {
    var intention = row['Intention'].trim()
    if (!intention) return false

    var charLimit = 140
    var limitIndex = intention.indexOf(' ', charLimit - 10)
    var sentenceEnd = intention.indexOf('. ')
    var title, details

    if (intention.length <= charLimit) {
      title = intention
      details = ''
    } else if (sentenceEnd > -1 && sentenceEnd < limitIndex) {
      title = intention.substring(0, sentenceEnd + 1)
      details = intention.substring(sentenceEnd + 2).trim()
    } else {
      title = intention.substring(0, limitIndex) + '...'
      details = '...' + intention.substring(limitIndex + 1)
    }

    if (details) {
      details = details
      .replace(/\n{2,}/, '\n')
      .replace(/^(.+)$/mg, '<p>$1</p>')
    }

    return User.find(row['Email'])
    .then(user => {
      var email = user.get('email')
      console.log(`${email}\nTITLE:   ${title}\nDETAILS: ${details}\n`)

      return Post.create({
        name: title,
        description: details,
        user_id: user.id,
        type: 'intention'
      })
      .then(post => Promise.join(
        options.community.posts().attach(post.id),
        post.followers().attach(user.id)
      ))
    })
  }
}

var UserImport = module.exports = {
  import: options =>
    runWithCSVStream(getStream(options), options, row => {
      const convert = getConverter(options.convert)
      createUser(convert(row, options), options)
    }),

  run: (options) => {
    var promises = []
    return runWithCSVStream(getStream(options), options, row => {
      var op = operations[options.operation]
      promises.push(op(row, options))
    })
    .then(() => Promise.all(promises))
  },

  converters,
  operations
}

if (require.main === module) {
  var skiff = require('../../lib/skiff')
  skiff.lift({
    log: {
      level: 'warn'
    },
    start: () => {
      Community.find('sustainablehuman')
      .then(community => UserImport.run({
        operation: 'sustainableHumanIntentions',
        filename: '../sustainablehuman.csv',
        community
      }))
      .then(() => skiff.lower())
    }
  })
}
