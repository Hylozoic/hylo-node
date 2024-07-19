/*
  example usage for a remote CSV with no header row and columns for name, email,
  & image:

  UserImport.import({
    url: 'http://foo.com/test.csv',
    headers: ['name', 'email', 'avatar_url'],
    group: {id: 1}
  })

*/

import { WritableStreamBuffer } from 'stream-buffers'
const request = require('request')
const fs = require('fs')
const csv = require('csv-parser')
const validator = require('validator')
const _ = require('lodash')

const promisifyStream = stream =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })

const getStream = ({ url, filename, stream }) => {
  if (stream) return stream
  if (url) return request(url)
  return fs.createReadStream(filename)
}

const getConverter = convert => {
  // you can pass a function that maps from arbitrary values
  // to the field names that the User model expects
  if (!convert) {
    return row => row
  } else if (typeof convert === 'string') {
    return converters[convert]
  } else {
    return convert
  }
}

const runWithCSVStream = function (stream, options, rowAction) {
  stream.pipe(csv({headers: options.headers})).on('data', rowAction)
  return promisifyStream(stream)
}

const runWithJSONStream = function (stream, options, rowAction) {
  const buffer = new WritableStreamBuffer()
  const promise = promisifyStream(stream)
  stream.pipe(buffer)
  return promise.then(() => {
    const data = JSON.parse(buffer.getContentsAsString())
    return Promise.map(data, rowAction)
  })
}

export function createUser (attrs, options) {
  if (!attrs) return
  const { verbose, group, dryRun } = options
  const { name, email } = attrs

  if (!validator.isEmail(email)) {
    console.error('invalid email for ' + name)
    return
  }

  return User.isEmailUnique(email)
  .then(unique => {
    if (!unique) {
      if (verbose) console.error('email already exists: ' + email)
      return
    }

    if (dryRun) {
      console.log(`dry run: ${name} <${email}>`)
      return
    }

    // TODO handle skills as tags
    return User.create(_.merge(attrs, {
      group: group,
      settings: {
        digest_frequency: 'weekly'
      },
      created_at: new Date(),
      updated_at: new Date()
    }))
    .tap(user => {
      if (group && group.id === '9') {
        return Email.sendSimpleEmail(
          user.get('email'), 'tem_GC822hsXScRMV23pddPNZM',
          {recipient_name: name.split(' ')[0]},
          {sender: {name: 'Impact Hub Oakland'}}
        )
      }
    })
  })
}

export const converters = {
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

export const operations = {
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
        options.group.posts().attach(post.id),
        post.followers().attach(user.id)
      ))
    })
  }
}

export const runImport = options => {
  if (!options.group) throw new Error('No group specified')

  const method = options.json ? runWithJSONStream : runWithCSVStream
  return method(getStream(options), options, row => {
    const convert = getConverter(options.convert)
    return createUser(convert(row, options), options)
  })
}

export const run = (options) => {
  var promises = []
  return runWithCSVStream(getStream(options), options, row => {
    var op = operations[options.operation]
    promises.push(op(row, options))
  })
  .then(() => Promise.all(promises))
}

if (require.main === module) {
  var skiff = require('../../lib/skiff')
  skiff.lift({
    log: {level: 'warn'},
    start: () =>
      Group.find('impact-hub-baltimore')
      .then(group => runImport({
        json: true,
        filename: './nexudus.json',
        group
      }))
      .then(skiff.lower)
  })
}
