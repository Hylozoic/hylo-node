import { values, merge, pick, filter, includes, isEmpty, get } from 'lodash'

const isJustNewPost = activity => {
  const reasons = activity.get('meta').reasons
  return reasons.every(reason => reason.match(/^newPost/))
}

module.exports = bookshelf.Model.extend({
  tableName: 'activity',

  actor: function () {
    return this.belongsTo(User, 'actor_id')
  },

  reader: function () {
    return this.belongsTo(User, 'reader_id')
  },

  comment: function () {
    return this.belongsTo(Comment)
  },

  post: function () {
    return this.belongsTo(Post)
  },

  community: function () {
    return this.belongsTo(Community)
  },

  notifications: function () {
    return this.hasMany(Notification)
  },

  createNotifications: function (trx) {
    var self = this
    return self.load([
      'reader',
      'reader.memberships',
      'post',
      'post.communities',
      'comment',
      'comment.post',
      'comment.post.communities',
      'community'
    ], {transacting: trx})
    .then(() => Promise.map(Activity.generateNotifications(self), notification =>
      new Notification({
        activity_id: self.id,
        medium: notification.medium
      }).save({}, {transacting: trx})))
  }

}, {
  Action: {
    Mention: 'mention', // you are mentioned in a post or comment
    Comment: 'comment', // someone makes a comment on a post you follow
    FollowAdd: 'followAdd', // you are added as a follower
    Follow: 'follow', // someone follows your post
    Unfollow: 'unfollow' // someone leaves your post
  },

  find: function (id) {
    return this.where({id}).fetch()
  },

  joinWithContent: q => {
    q.whereRaw('(comment.active = true or comment.id is null)')
    .leftJoin('comment', function () {
      this.on('comment.id', '=', 'activity.comment_id')
    })

    q.whereRaw('(post.active = true or post.id is null)')
    .leftJoin('post', function () {
      this.on('post.id', '=', 'activity.post_id')
    })
  },

  joinWithCommunity: (communityId, q) => {
    q.where('post_community.community_id', communityId)
    .join('post_community', function () {
      this.on('comment.post_id', 'post_community.post_id')
      .orOn('post.id', 'post_community.post_id')
    })
  },

  forComment: function (comment, userId, action) {
    if (!action) {
      action = _.includes(comment.mentions(), userId.toString())
        ? this.Action.Mention
        : this.Action.Comment
    }

    return new Activity({
      reader_id: userId,
      actor_id: comment.get('user_id'),
      comment_id: comment.id,
      post_id: comment.get('post_id'),
      action: action,
      created_at: comment.get('created_at')
    })
  },

  forPost: function (post, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: post.get('user_id'),
      post_id: post.id,
      action: this.Action.Mention,
      created_at: post.get('created_at')
    })
  },

  forFollowAdd: function (follow, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: follow.get('added_by_id'),
      post_id: follow.get('post_id'),
      action: this.Action.FollowAdd,
      created_at: follow.get('date_added')
    })
  },

  forFollow: function (follow, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: follow.get('user_id'),
      post_id: follow.get('post_id'),
      action: this.Action.Follow,
      created_at: follow.get('date_added')
    })
  },

  forUnfollow: function (post, unfollowerId) {
    return new Activity({
      reader_id: post.get('user_id'),
      actor_id: unfollowerId,
      post_id: post.id,
      action: this.Action.Unfollow,
      created_at: new Date()
    })
  },

  unreadCountForUser: function (user) {
    return Activity.query().where({reader_id: user.id, unread: true}).count()
    .then(rows => rows[0].count)
  },

  mergeReasons: function (reasons) {
    const merged = values(reasons.reduce((acc, reason) => {
      var current = acc[reason.reader_id]
      if (acc[reason.reader_id]) {
        const fields = ['actor_id', 'community_id']
        fields.map(field => {
          if (reason[field]) {
            current[field] = reason[field]
          }
        })
        current.reasons.push(reason.reason)
      } else {
        acc[reason.reader_id] = reason
        acc[reason.reader_id].reasons = [acc[reason.reader_id].reason]
      }
      return acc
    }, {}))
    return merged
  },

  saveReasons: function (reasons, trx) {
    return Promise.map(reasons, reason =>
      Activity.createWithNotifications(
        merge(pick(reason, ['post_id', 'community_id', 'comment_id', 'actor_id', 'reader_id']),
          {meta: {reasons: reason.reasons}}),
        trx))
  },

  generateNotifications: function (activity) {
    var notifications = []
    var communities
    var user = activity.relations.reader
    if (activity.relations.post) {
      communities = get(activity, 'relations.post.relations.communities', []).map(c => c.id)
    } else if (activity.relations.comment) {
      communities = get(activity, 'relations.comment.relations.post.relations.communities', []).map(c => c.id)
    } else if (activity.relations.community) {
      communities = [activity.relations.community.id]
    }
    const relevantMemberships = filter(user.relations.memberships.models, mem => includes(communities, mem.get('community_id')))
    const membershipsPermitting = (setting) =>
      filter(relevantMemberships, mem => mem.get('settings')[setting])

    const emailable = membershipsPermitting('send_email')
    const pushable = membershipsPermitting('send_push_notifications')

    if (!isEmpty(emailable)) {
      notifications.push({
        medium: Notification.MEDIUM.Email,
        communities: emailable.map(mem => mem.get('community_id'))
      })
    }

    if (!isEmpty(pushable)) {
      notifications.push({
        medium: Notification.MEDIUM.Push,
        communities: pushable.map(mem => mem.get('community_id'))
      })
    }

    if (!isJustNewPost(activity)) {
      notifications.push({
        medium: Notification.MEDIUM.InApp,
        communities: communities
      })
    }

    return notifications
  },

  createWithNotifications: function (attributes, trx) {
    return new Activity(attributes)
    .save({}, {transacting: trx})
    .tap(activity => activity.createNotifications(trx))
  }
})
