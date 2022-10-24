import moment from 'moment-timezone'
import { merge, transform, sortBy } from 'lodash'

// TODO: this is old and broken
var rawMetricsQuery = startTime => Promise.props({
  community: Community.query(q => {
    q.select(['id', 'name', 'created_at', 'avatar_url'])
  }).query(),

  user: User.query(q => {
    q.where('users.created_at', '>', startTime)
    q.leftJoin('communities_users', 'users.id', 'communities_users.user_id')
    q.select(['users.id', 'users.created_at', 'communities_users.community_id'])
  }).query(),

  post: Post.query(q => {
    q.where('posts.created_at', '>', startTime)
    q.where('posts.type', '!=', 'welcome')
    q.where('posts.user_id', '!=', User.AXOLOTL_ID)
    q.join('communities_posts', 'posts.id', 'communities_posts.post_id')
    q.select(['posts.id', 'posts.created_at', 'communities_posts.community_id', 'posts.user_id'])
  }).query(),

  comment: Comment.query(q => {
    q.where('comments.created_at', '>', startTime)
    q.join('communities_posts', 'comments.post_id', 'communities_posts.post_id')
    q.select(['comments.id', 'comments.created_at', 'communities_posts.community_id', 'comments.user_id'])
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
