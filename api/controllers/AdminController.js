import moment from 'moment'
import { merge, transform, sortBy } from 'lodash'

// this is the id of the user that owns all the starter posts
var axolotlId = 13986

var rawMetricsQuery = startTime => Promise.props({
  community: Community.query(q => {
    q.select(['id', 'name', 'created_at', 'avatar_url'])
  }).query(),

  user: User.query(q => {
    q.where('users.created_at', '>', startTime)
    q.leftJoin('users_community', 'users.id', 'users_community.user_id')
    q.select(['users.id', 'users.created_at', 'users_community.community_id'])
  }).query(),

  post: Post.query(q => {
    q.where('post.created_at', '>', startTime)
    q.where('post.type', '!=', 'welcome')
    q.where('post.user_id', '!=', axolotlId)
    q.join('post_community', 'post.id', 'post_community.post_id')
    q.select(['post.id', 'post.created_at', 'post_community.community_id', 'post.user_id'])
  }).query(),

  comment: Comment.query(q => {
    q.where('comment.created_at', '>', startTime)
    q.join('post_community', 'comment.post_id', 'post_community.post_id')
    q.select(['comment.id', 'comment.created_at', 'post_community.community_id', 'comment.user_id'])
  }).query()
})

module.exports = {
  loginAsUser: function (req, res) {
    return User.find(req.param('userId'))
    .then(user => UserSession.login(req, user, 'admin'))
    .then(() => res.redirect('/app'))
  },

  rawMetrics: function (req, res) {
    const startTime = moment().subtract(3, 'months').toDate()
    return rawMetricsQuery(startTime)
    .then(props => {
      let result = props.community.reduce((acc, c) => {
        acc[c.id] = merge(c, {events: []})
        return acc
      }, {})

      result.none = {id: 'none', name: 'No community', events: []}

      ;['user', 'post', 'comment'].forEach(name => {
        props[name].forEach(item => {
          const key = item.community_id || 'none'
          result[key].events.push({
            time: Date.parse(item.created_at),
            user_id: item.user_id || item.id,
            name
          })
        })
      })

      result = transform(result, (acc, c, k) => {
        if (c.events.length === 0) return
        c.events = sortBy(c.events, 'time')
        acc[k] = c
      }, {})

      res.ok(result)
    })
  }
}
