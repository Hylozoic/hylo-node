import stringify from 'csv-stringify'
import { groupFilter } from '../graphql/filters'

// Toplevel API entrypoint to check auth & route to desired exporter flow based on parameters
module.exports = {
  groupData: async function (req, res) {
    const p = req.allParams()

    const user = await new User({ id: req.session.userId }).fetch({ columns: ['email'] })

    if (!p.groupId) {
      return res.status(400).send({ error: 'Please specify group ID' })
    }
    if (!p.datasets || !p.datasets.length) {
      return res.status(400).send({ error: 'Please specify datasets to export' })
    }

    // auth check
    let ok = false
    try {
      ok = await GroupMembership.hasResponsibility(req.session.userId, p.groupId, Responsibility.constants.RESP_ADMINISTRATION)
    } catch (err) {
      return res.status(422).send({ error: err.message ? err.message : err })
    }

    if (!ok) {
      return res.status(403).send({ error: 'No access' })
    }

    // process specified datasets
    if (p.datasets.includes('members')) {
      exportMembers(p.groupId, req, user.get('email'))
      return res.ok({})
    }

    // got to the end and nothing output/exited, throw error
    throw new Error('Unknown datasets specified: ' + JSON.stringify(p.datasets))
  }
}

/**
 * Group members export by Group ID
 */
async function exportMembers (groupId, req, email) {
  const users = await new Group({ id: groupId })
    .members()
    .fetch()

  const group = await new Group({ id: groupId })
    .fetch()

  const results = []
  const questions = {}

  // iterate over all group members
  await Promise.all(users.map((u, idx) => {
    // pluck core user data into results
    results.push(u.pick([
      'id', 'name', 'contact_email', 'contact_phone', 'avatar_url', 'tagline', 'bio',
      'url', 'twitter_name', 'facebook_url', 'linkedin_url'
    ]))

    // return combined promise to load all dependent user data and
    // assign final child query results back onto matching result objects upon completion
    return Promise.all([

      // location (full details)
      u.locationObject().fetch()
        .then(location => {
          results[idx].location = renderLocation(location)
        }),

      // affiliations
      u.affiliations().fetch()
        .then(affils => {
          results[idx].affiliations = accumulatePivotCell(affils, renderAffiliation)
        }),

      // skills
      u.skills().fetch()
        .then(skills => {
          results[idx].skills = accumulatePivotCell(skills, renderSkill)
        }),

      // skills to learn
      u.skillsToLearn().fetch()
        .then(skills => {
          results[idx].skills_to_learn = accumulatePivotCell(skills, renderSkill)
        }),

      // Join questions & answers
      // TODO: pull direectly from groupJoinQuestionAnswers. how to sort by latest of each question within that group?
      // https://stackoverflow.com/questions/12245289/select-unique-values-sorted-by-date
      u.groupJoinQuestionAnswers()
        .where({ group_id: groupId })
        .orderBy('created_at', 'DESC')
        .fetch({ withRelated: ['question'] })
        .then(answers => {
          return Promise.all(answers.map(qa =>
            Promise.all([
              qa.load(['question']),
              Promise.resolve(qa)
            ])
          ))
        })
        .then(data => {
          if (!data) return
          results[idx].join_question_answers = accumulateJoinQA(data, questions)
        }),

      // other groups the requesting member has acccess to
      groupFilter(req.session.userId)(u.groups()).fetch()
        .then(groups => {
          results[idx].groups = accumulatePivotCell(groups, renderGroup)
        })

    ])
  }))

  // send data as CSV response
  output(results, [
    'id', 'name', 'contact_email', 'contact_phone', 'location', 'avatar_url', 'tagline', 'bio',
    { key: 'url', header: 'personal_url' },
    'twitter_name', 'facebook_url', 'linkedin_url',
    'skills', 'skills_to_learn',
    'affiliations',
    'groups'
  ], email, group.get('name'), questions)
}

// toplevel output function for specific endpoints to complete with
function output (data, columns, email, groupName, questions) {
  // Add each question as a column in the results
  const questionsArray = Object.values(questions)
  questionsArray.forEach((question) => {
    columns.push(`${question.text}`)
  })

  // Add rows for each user to match their answers with the added question colums
  const transformedData = data.map((user) => {
    const answers = user.join_question_answers
    questionsArray.forEach((question) => {
      if (!answers) {
        user[`${question.text}`] = '-'
      } else {
        const foundAnswer = answers.find((answer) => `${question.id}` === `${answer.question_id}`)
        user[`${question.text}`] = foundAnswer
          ? user[`${question.text}`] = foundAnswer.answer
          : user[`${question.text}`] = '-'
      }
    })
    return user
  })

  stringify(transformedData, {
    header: true,
    columns
  }, (err, output) => {
    if (err) {
      console.error(err)
      return
    }
    const formattedDate = new Date().toISOString().slice(0, 10)
    const buff = Buffer.from(output)
    const base64output = buff.toString('base64')

    Queue.classMethod('Email', 'sendExportMembersList', {
      email: email,
      files: [
        {
          id: `members-export-${groupName}-${formattedDate}.csv`,
          data: base64output
        }
      ]
    })
  })
}

// reduce helper to format lists of records into single CSV cells
function accumulatePivotCell (records, renderValue) {
  return records.reduce((joined, a) => joined ? (joined + `,${renderValue(a)}`) : renderValue(a), null)
}

const accumulateJoinQA = (records, questions) => {
  // an array of question/answer pairs
  if (records[0] && records[0][0]) {
    records.forEach((record) => {
      const question = record[0].toJSON().question
      questions[question.id] = question
    })
  }
  return records.reduce((accum, record) => accum.concat(renderJoinQuestionAnswersToJSON(record)), [])
}

// formatting for individual sub-cell record types

function renderLocation (l) {
  if (l === null || l.get('center') === null) {
    return ''
  }

  const geometry = l.get('center') // :TODO: make this work for polygonal locations, if needed
  const lat = geometry.lat
  const lng = geometry.lng
  return `${l.get('full_text')}${lat && lng ? ` (${lat.toFixed(3)},${lng.toFixed(3)})` : ''}`
}

function renderAffiliation (a) {
  return `${a.get('role')} ${a.get('preposition')} ${a.get('org_name')} ${a.get('url') ? `(${a.get('url')})` : ''}`
}

function renderSkill (s) {
  return s.get('name')
}

function renderJoinQuestionAnswersToJSON (QApair) {
  if (QApair.length === 0) { return [] }
  return [QApair[1].toJSON()]
}

function renderGroup (g) {
  return `${g.get('name')} (${Frontend.Route.group(g)})`
}
