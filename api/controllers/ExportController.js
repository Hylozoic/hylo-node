import stringify from 'csv-stringify'
import { groupFilter } from '../graphql/filters'

// Toplevel API entrypoint to check auth & route to desired exporter flow based on parameters
module.exports = {
  groupData: async function (req, res) {
    const p = req.allParams()

    const user = await new User({id: req.session.userId} )
                  .fetch({ columns: ['email']})

    if (!p.groupId) {
      throw new Error("Please specify group ID")
    }
    if (!p.datasets || !p.datasets.length) {
      throw new Error("Please specify datasets to export")
    }

    // auth check
    let ok = false
    try {
      ok = GroupMembership.hasModeratorRole(req.session.userId, p.groupId)
    } catch (err) {
      return res.status(422).send({ error: err.message ? err.message : err })
    }

    if (!ok) {
      return res.status(403).send({ error: "No access" })
    }

    // process specified datasets
    if (p.datasets.includes('members')) {
      exportMembers(p.groupId, req, user.get('email'))
      return res.ok({})
    }

    // got to the end and nothing output/exited, throw error
    throw new Error("Unknown datasets specified: " + JSON.stringify(p.datasets))
  }
}

/**
 * Group members export by Group ID
 */
async function exportMembers(groupId, req, email) {
  const users = await new Group({ id: groupId })
                  .members()
                  .fetch()

  const results = []

  // iterate over all group members
  await Promise.all(users.map((u, idx) => {
    // pluck core user data into results
    results.push(u.pick([
      'name', 'contact_email', 'contact_phone', 'avatar_url', 'tagline', 'bio',
      'url', 'twitter_url', 'facebook_url', 'linkedin_url'
    ]))

    // return combined promise to load all dependent user data and
    // assign final child query results back onto matching result objects upon completion
    return Promise.all([

      // location (full details)
      u.locationObject().fetch()
        .then(location => {
          results[idx]['location'] = renderLocation(location)
        }),

      // affiliations
      u.affiliations().fetch()
        .then(affils => {
          results[idx]['affiliations'] = accumulatePivotCell(affils, renderAffiliation)
        }),

      // skills
      u.skills().fetch()
        .then(skills => {
          results[idx]['skills'] = accumulatePivotCell(skills, renderSkill)
        }),

      // skills to learn
      u.skillsToLearn().fetch()
        .then(skills => {
          results[idx]['skills_to_learn'] = accumulatePivotCell(skills, renderSkill)
        }),

      // Join request questions & answers
      u.joinRequests()
        .where({ group_id: groupId, status: JoinRequest.STATUS.Accepted })
        .orderBy('created_at', 'DESC')
        .fetchOne()
        .then(jr => {
          if (!jr) {
            return null
          }
          return jr.questionAnswers().fetch()
            .then(qas => Promise.all(qas.map(qa =>
              Promise.all([
                qa.question().fetch(),
                Promise.resolve(qa)
              ])
            )))
        })
        .then(data => {
          if (!data) return
          results[idx]['join_request_questions'] = accumulatePivotCell(data, renderJoinRequestAnswer)
        }),

      // other groups the requesting member has acccess to
      groupFilter(req.session.userId)(u.groups()).fetch()
        .then(groups => {
          results[idx]['groups'] = accumulatePivotCell(groups, renderGroup)
        }),

    ])
  }))

  // send data as CSV response
  output(results, [
    'name', 'contact_email', 'contact_phone', 'location', 'avatar_url', 'tagline', 'bio',
    { key: 'url', header: 'personal_url' },
    'twitter_url', 'facebook_url', 'linkedin_url',
    'skills', 'skills_to_learn',
    'join_request_questions',
    'affiliations',
    'groups'
  ], email)


}

// toplevel output function for specific endpoints to complete with
function output(data, columns, email) {
  // res.setHeader('Content-Type', 'text/csv')
  // res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'download-' + Date.now() + '.csv\"')

  stringify(data, {
    header: true,
    columns
  }, (err, output) => {
    Queue.classMethod('Email', 'sendExportMembersList', {
      email:  email,
      data: output
    })
  })

}

// reduce helper to format lists of records into single CSV cells
function accumulatePivotCell(records, renderValue) {
  return records.reduce((joined, a) => joined ? (joined + `,${renderValue(a)}`) : renderValue(a), null)
}

// formatting for individual sub-cell record types

function renderLocation(l) {
  if (l === null || l.get('center') === null) {
    return ''
  }

  const geometry = l.get('center')  // :TODO: make this work for polygonal locations, if needed
  const lat = geometry.lat
  const lng = geometry.lng
  return `${l.get('full_text')}${lat && lng ? ` (${lat.toFixed(3)},${lng.toFixed(3)})` : ''}`
}

function renderAffiliation(a) {
  return `${a.get('role')} ${a.get('preposition')} ${a.get('org_name')} ${a.get('url') ? `(${a.get('url')})` : ''}`
}

function renderSkill(s) {
  return s.get('name')
}

function renderJoinRequestAnswer(s) {
  return `${s[0].get('text')}: ${s[1].get('answer')}`
}

function renderGroup(g) {
  return `${g.get('name')} (${Frontend.Route.group(g)})`
}
