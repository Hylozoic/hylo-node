import { values, omit, filter, includes, isEmpty, get } from 'lodash'

const isJustNewPost = activity => {
  const reasons = activity.get('meta').reasons
  return reasons.every(reason => reason.match(/^newPost/))
}

const isAnnouncement = activity => {
  const reasons = activity.get('meta').reasons
  return filter(reasons, reason => reason.match(/^announcement/)).length > 0
}

const isTopic = activity => {
  const reasons = activity.get('meta').reasons
  const t = filter(reasons, reason => reason.match(/^tag/)).length > 0
  return t
}

const mergeByReader = activities => {
  const fields = ['actor_id', 'community_id']
  const merged = activities.reduce((acc, activity) => {
    const current = acc[activity.reader_id]
    if (acc[activity.reader_id]) {
      fields.forEach(f => {
        if (activity[f]) current[f] = activity[f]
      })
      current.reasons.push(activity.reason)
    } else {
      acc[activity.reader_id] = Object.assign(
        {reasons: [activity.reason]}, omit(activity, 'reason'))
    }
    return acc
  }, {})
  return values(merged)
}

const removeForRelation = (model) => (id, trx) => {
  const trxOpt = {transacting: trx}
  return Activity.where(`${model}_id`, id).query()
  .pluck('id').transacting(trx)
  .then(ids => {
    // TODO: New Activity count needs to be decremented
    // if inApp medium is used-- see User#decNewNotificationCount
    return Notification.where('activity_id', 'in', ids).destroy(trxOpt)
    .then(() => Activity.where('id', 'in', ids).destroy(trxOpt))
  })
}

module.exports = bookshelf.Model.extend({
  tableName: 'activities',

  actor: function () {
    return this.belongsTo(User, 'actor_id')
  },

  reader: function () {
    return this.belongsTo(User, 'reader_id')
  },

  comment: function () {
    return this.belongsTo(Comment)
  },

  contribution: function () {
    return this.belongsTo(Contribution, 'contribution_id')
  },

  post: function () {
    return this.belongsTo(Post)
  },

  parentComment: function () {
    return this.belongsTo(Comment, 'parent_comment_id')
  },

  community: function () {
    return this.belongsTo(Community)
  },

  notifications: function () {
    return this.hasMany(Notification)
  },

  createNotifications: async function (trx) {
    const relations = ['reader']
    if (this.get('post_id')) {
      relations.splice(0, 0, 'post', 'post.communities')
    }
    if (this.get('contribution_id')) {
      relations.splice(0, 0, 'contribution', 'contribution.post', 'contribution.user')
    }
    if (this.get('comment_id')) {
      relations.splice(0, 0, 'comment', 'comment.post', 'comment.post.communities')
    }
    if (this.get('community_id')) {
      relations.push('community')
    }
    await this.load(relations, {transacting: trx})
    const notificationData = await Activity.generateNotificationMedia(this)
    return Promise.map(notificationData, medium =>
      new Notification({
        activity_id: this.id,
        created_at: new Date(),
        medium,
        user_id: this.get('reader_id')
      }).save({}, {transacting: trx}))
  }

}, {
  Reason: {
    Mention: 'mention', // you are mentioned in a post or comment
    Comment: 'comment', // someone makes a comment on a post you follow
    Contribution: 'contribution', // someone add you as a contributor to a #request
    FollowAdd: 'followAdd', // you are added as a follower
    Follow: 'follow', // someone follows your post
    Unfollow: 'unfollow', // someone leaves your post
    Announcement: 'announcement'
  },

  find: function (id) {
    return this.where({id}).fetch()
  },

  filterInactiveContent: q => {
    q.whereRaw('(comments.active = true or comments.id is null)')
    .leftJoin('comments', function () {
      this.on('comments.id', '=', 'activities.comment_id')
    })

    q.whereRaw('(posts.active = true or posts.id is null)')
    .leftJoin('posts', function () {
      this.on('posts.id', '=', 'activities.post_id')
    })
  },

  joinWithCommunity: (communityId, q) => {
    q.where('communities_posts.community_id', communityId)
    .join('communities_posts', function () {
      this.on('comments.post_id', 'communities_posts.post_id')
      .orOn('posts.id', 'communities_posts.post_id')
    })
  },

  forComment: function (comment, userId, action) {
    if (!action) {
      action = includes(comment.mentions(), userId.toString())
        ? this.Reason.Mention
        : this.Reason.Comment
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

  forPostMention: function (post, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: post.get('user_id'),
      post_id: post.id,
      meta: {reasons: [this.Reason.Mention]},
      created_at: post.get('created_at')
    })
  },

  forFollowAdd: function (follow, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: follow.get('added_by_id'),
      post_id: follow.get('post_id'),
      meta: {reasons: [this.Reason.FollowAdd]},
      created_at: follow.get('added_at')
    })
  },

  forFollow: function (follow, userId) {
    return new Activity({
      reader_id: userId,
      actor_id: follow.get('user_id'),
      post_id: follow.get('post_id'),
      meta: {reasons: [this.Reason.Follow]},
      created_at: follow.get('added_at')
    })
  },

  forUnfollow: function (post, unfollowerId) {
    return new Activity({
      reader_id: post.get('user_id'),
      actor_id: unfollowerId,
      post_id: post.id,
      meta: {reasons: [this.Reason.Unfollow]},
      created_at: new Date()
    })
  },

  unreadCountForUser: function (user) {
    return Activity.query().where({reader_id: user.id, unread: true}).count()
    .then(rows => rows[0].count)
  },

  saveForReasonsOpts: function ({ activities }) {
    return Activity.saveForReasons(activities)
  },

  saveForReasons: function (activities, trx) {
    return Promise.map(mergeByReader(activities), activity => {
      const attrs = Object.assign(
        {},
        omit(activity, 'reasons'),
        {meta: {reasons: activity.reasons}}
      )

      return Activity.createWithNotifications(attrs, trx)
    })
    .tap(() => Queue.classMethod('Notification', 'sendUnsent'))
  },

  communityIds: function (activity) {
    if (activity.get('post_id')) {
      return get(activity, 'relations.post.relations.communities', []).map(c => c.id)
    } else if (activity.get('comment_id')) {
      return get(activity, 'relations.comment.relations.post.relations.communities', []).map(c => c.id)
    } else if (activity.get('community_id')) {
      return [activity.relations.community.id]
    }
    return []
  },

  generateNotificationMedia: async function (activity) {
    var notifications = []
    var communities = Activity.communityIds(activity)
    var user = activity.relations.reader

    const memberships = await user.groupMembershipsForModel(Community)
    .fetch({withRelated: 'group'})

    const relevantMemberships = filter(memberships.models, mem =>
      includes(communities, mem.relations.group.get('group_data_id')))
    const membershipsPermitting = key =>
      filter(relevantMemberships, mem => mem.getSetting(key))

    const emailable = membershipsPermitting('sendEmail')
    const pushable = membershipsPermitting('sendPushNotifications')

    if ((!isEmpty(emailable) && !isJustNewPost(activity)) || isAnnouncement(activity)) {
      notifications.push(Notification.MEDIUM.Email)
    }

    if (isTopic(activity) || !isEmpty(pushable) || isAnnouncement(activity)) {
      notifications.push(Notification.MEDIUM.Push)
    }

    if (!isJustNewPost(activity) || isAnnouncement(activity)) {
      notifications.push(Notification.MEDIUM.InApp)
    }

    return notifications
  },

  createWithNotifications: function (attributes, trx) {
    return new Activity(Object.assign({created_at: new Date()}, attributes))
    .save({}, {transacting: trx})
    .tap(activity => activity.createNotifications(trx))
  },

  removeForComment: removeForRelation('comment'),

  removeForPost: removeForRelation('post'),

  removeForContribution: removeForRelation('contribution')

})
