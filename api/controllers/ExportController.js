import stringify from 'csv-stringify'

module.exports = {
  groupData: function (req, res) {
    const { groupId, datasets } = req.allParams()

    if (!datasets || !datasets.length) {
      throw new Error("Please specify datasets to export")
    }

    // auth check
    GroupMembership.hasModeratorRole(req.session.userId, groupId)
      .then(ok => {
        if (!ok) {
          res.status(422).send({ error: "No access" })
          return
        }

        // process specified datasets
        if (datasets.includes('members')) {
          return exportMembers(req, res)
        }

        // got to the end and nothing output/exited, throw error
        throw new Error("Unknown datasets specified: " + JSON.stringify(datasets))
       })
      .catch(function (err) {
        res.status(422).send({ error: err.message ? err.message : err })
      })
  }
}

function exportMembers(req, res) {
  const users = new Group({ id: groupId })
                  .members()

  const results = users.map(u => Object.assign({}, u, {
    affiliations: u.affiliations().reduce((joined, a) => joined + (joined.length ? `,${JSON.stringify(a)}` : JSON.stringify(a))),
  }))

  output(res, results, [
    'name', 'contact_email', 'contact_phone', 'location', 'avatar_url', 'tagline', 'bio',
    { key: 'url', header: 'personal_url' },
    'twitter_url', 'facebook_url', 'linkedin_url',
    // skills, skills to learn,
    // groups the person is a part of (that the moderator can see)
    'affiliations'
  ])
}

function output(res, data, columns) {
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'download-' + Date.now() + '.csv\"')

  stringify(users, {
    header: true,
    columns
  })
    .pipe(res)
}
