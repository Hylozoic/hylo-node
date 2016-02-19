var heredoc = require('heredoc')
var moment = require('moment')

var sanitizeForJSON = function (str) {
  return str.replace(/\\/g, '\\\\')
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r')
  .replace(/\t/g, '\\t')
  .replace(/\f/g, '\\f')
  .replace(/"/g, '\\"')
  .replace(/'/g, "\\'")
  .replace(/\&/g, '\\&')
}

var nvd3Format = function (data, times) {
  var maxSeries
  return _(data).keys()
  .tap(keys => maxSeries = Math.min(keys.length, 19))
  .sortBy(key => -1 * _.sum(_.values(data[key])), _.identity)
  .reduce((result, name, index, keys) => {
    if (index < maxSeries) {
      result.push({
        key: sanitizeForJSON(name),
        values: _.map(times, t => [Number(t), data[name][t] || 0])
      })
    } else if (index === maxSeries) {
      var otherNames = keys.slice(index, keys.length)
      result.push({
        key: format('Other (%s)', otherNames.length),
        values: _.map(times, t => [Number(t), _.sum(otherNames, name => data[name][t] || 0)])
      })
    }
    return result
  }, [])
}

// this is the id of the user that owns all the starter posts
var axolotlId = 13986

var countNew = function (model, interval, unit) {
  var now = moment()
  var then = now.clone().subtract(interval, unit)
  var data = {}
  var times = {}
  var withRelated = (model === Comment ? ['post.communities'] : ['communities'])

  return model.query(q => {
    q.whereRaw('created_at between ? and ?', [then, now])

    if (model === Post) {
      q.where('type', '!=', 'welcome')

      // this removes starter posts from the metrics
      q.where('user_id', '!=', axolotlId)
    }
  }).fetchAll({withRelated: withRelated})
  .then(results => {
    results.models.map(x => {
      var community = (model === Comment ? x.relations.post : x).relations.communities.first()
      var series = (community ? community.get('name').substring(0, 15) : 'none')
      var time = Number(moment(x.get('created_at')).startOf('day'))

      // create a nested hash for communities & times
      if (!data[series]) data[series] = {}
      if (!data[series][time]) data[series][time] = 0
      data[series][time] += 1

      // keep a list of all times seen
      // the stacked bar chart in nvd3 requires all series
      // to be the same length, so we have to zero-fill
      if (!times[time]) times[time] = true
    })

    return nvd3Format(data, _.keys(times).sort())
  })
}

var newUserActionRate = function (table, startTime, pgInterval) {
  var query = heredoc.strip(function () { /*
  select
    cohort,
    count(*) as user_count,
    round(sum(sub.acted)/count(*)::float::numeric, 2) as post_rate
  from (
    select
      u.id,
      u.email,
      date_trunc('day', u.created_at)::date as cohort,
      case when count(x.id) > 0 then 1 else 0 end as acted
    from
      users u
      left join %s x on (
        u.id = x.user_id
        and x.created_at - u.created_at < interval '%s'
      )
    where u.created_at >= ?
    group by u.id
  ) sub
  group by cohort
  order by cohort desc
  */})

  return bookshelf.knex.raw(format(query, table, pgInterval), startTime)
  .then(data => data.rows.map(r => [Date.parse(r.cohort), Number(r.post_rate)]))
}

var newUserActivity = function (interval, unit) {
  var startTime = moment().subtract(interval, unit)
  return Promise.all([
    Promise.props({
      key: 'post in 7 days',
      values: newUserActionRate('post', startTime, '7 days'),
      color: '#5799c7'
    }),
    Promise.props({
      key: 'comment in 7 days',
      values: newUserActionRate('comment', startTime, '7 days'),
      color: '#ff9f4a'
    })
  ])
}

module.exports = {
  countNew: countNew,
  newUserActivity: newUserActivity,

  index: function (req, res) {
    res.ok(req.user)
  },

  metrics: function (req, res) {
    Promise.props({
      newUsers: countNew(User, 1, 'month'),
      newPosts: countNew(Post, 1, 'month'),
      newComments: countNew(Comment, 1, 'month'),
      newUserActivity: newUserActivity(1, 'month')
    })
    .then(res.ok, res.serverError)
  },

  loginAsUser: function (req, res) {
    return User.find(req.param('userId'))
    .then(user => UserSession.login(req, user, 'admin'))
    .then(() => res.redirect('/'))
  }
}
