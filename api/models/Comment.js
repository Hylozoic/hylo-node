var url = require('url')

module.exports = bookshelf.Model.extend({
  tableName: 'comment',

  user: function () {
    return this.belongsTo(User)
  },

  post: function () {
    return this.belongsTo(Post)
  },

  text: function () {
    return this.get('text')
  },

  mentions: function () {
    return RichText.getUserMentions(this.text())
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  community: function () {
    return this.relations.post.relations.communities.first()
  },

  tags: function () {
    return this.belongsToMany(Tag).through(CommentTag)
  },

  createActivities: function (trx) {
    var self = this
    return self.load(['post', 'post.followers'])
    .then(() => {
      const followers = self.relations.post.relations.followers.map(follower => ({
        reader_id: follower.id,
        comment_id: self.id,
        post_id: self.relations.post.id,
        actor_id: self.get('user_id'),
        reason: 'newComment'
      }))
      const mentioned = RichText.getUserMentions(self.get('text')).map(mentionedId => ({
        reader_id: mentionedId,
        comment_id: self.id,
        post_id: self.relations.post.id,
        actor_id: self.get('user_id'),
        reason: 'commentMention'
      }))
      return Activity.saveReasons(Activity.mergeReasons(followers.concat(mentioned), trx))
    })
  }
}, {

  find: function (id, options) {
    return Comment.where({id: id}).fetch(options)
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = Comment
    }

    return collection.query(function (qb) {
      qb.whereRaw('comment.created_at between ? and ?', [startTime, endTime])
      qb.where('comment.active', true)
    })
  },

  sendNotifications: function (opts) {
    var comment, post, communityIds
    return bookshelf.transaction(trx => {
      return Comment.find(opts.commentId, {
        withRelated: ['user', 'post', 'post.communities', 'post.user', 'post.followers', 'post.relatedUsers'],
        transacting: trx
      }).then(c => {
        comment = c
        post = c.relations.post
        communityIds = post.relations.communities.pluck('id')
        return [
          post.relations.followers.pluck('id'),
          RichText.getUserMentions(comment.get('text'))
        ]
      })
      .spread((existing, mentioned) => {
        var commenterId = comment.get('user_id')
        var newFollowers = _.difference(_.uniq(mentioned.concat(commenterId)), existing)
        var unmentionedOldFollowers = _.difference(_.without(existing, commenterId), mentioned)

        // TODO refactor this so we can get the devices for all the users to
        // send push notifications to in a single query
        return Promise.join(
          // create activity and send mention notification to all mentioned users
          Promise.map(mentioned, function (userId) {
            return Promise.join(
              queueSend(userId, comment.id, 'email', 'mention'),
              queueSend(userId, comment.id, 'push', 'mention'),
              Activity.forComment(comment, userId, Activity.Action.Mention)
              .save({}, {transacting: trx}),
              User.incNewNotificationCount(userId, communityIds, trx)
            )
          }),

          // create activity and send comment notification to all followers,
          // except the commenter and mentioned users
          Promise.map(unmentionedOldFollowers, function (userId) {
            return Promise.join(
              queueSend(userId, comment.id, 'email'),
              queueSend(userId, comment.id, 'push'),
              Activity.forComment(comment, userId, Activity.Action.Comment)
              .save({}, {transacting: trx}),
              User.incNewNotificationCount(userId, communityIds, trx)
            )
          }),

          // add all mentioned users and the commenter as followers, if not already following
          post.addFollowers(newFollowers, commenterId, {transacting: trx})
        )
      })
    }) // transaction
  },

  sendNotificationEmail: function (opts) {
    // opts.version corresponds to names of versions in SendWithUs

    return Promise.join(
      User.find(opts.recipientId),
      Comment.find(opts.commentId, {
        withRelated: [
          'user', 'post', 'post.communities', 'post.user', 'post.relatedUsers'
        ]
      })
    )
    .spread(function (recipient, comment) {
      if (!comment) return
      if (!recipient.get('send_email_preference')) return

      var post = comment.relations.post
      var commenter = comment.relations.user
      var poster = post.relations.user
      var community = post.relations.communities.models[0]
      var text = RichText.qualifyLinks(comment.get('text'))
      var replyTo = Email.postReplyAddress(post.id, recipient.id)

      var postLabel

      if (post.get('type') === 'welcome') {
        var relatedUser = post.relations.relatedUsers.first()
        if (relatedUser.id === recipient.id) {
          postLabel = 'your welcoming post'
        } else {
          postLabel = format("%s's welcoming post", relatedUser.get('name'))
        }
      } else {
        postLabel = format('%s %s: "%s"',
          (recipient.id === poster.id ? 'your' : 'the'), post.get('type'), post.get('name'))
      }

      return recipient.generateToken()
      .then(token => Email.sendNewCommentNotification({
        version: opts.version,
        email: recipient.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: format('%s (via Hylo)', commenter.get('name'))
        },
        data: {
          community_name: community.get('name'),
          commenter_name: commenter.get('name'),
          commenter_avatar_url: commenter.get('avatar_url'),
          commenter_profile_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.profile(commenter) + '?ctt=comment_email'),
          comment_text: text,
          post_label: postLabel,
          post_title: post.get('name'),
          comment_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.post(post) + '?ctt=comment_email' + `#comment-${comment.id}`),
          unfollow_url: Frontend.Route.tokenLogin(recipient, token,
            Frontend.Route.unfollow(post, community)),
          tracking_pixel_url: Analytics.pixelUrl('Comment', {userId: recipient.id})
        }
      }))
    })
  },

  sendPushNotification: function (opts) {
    return User.find(opts.recipientId)
    .then(recipient => recipient.get('push_follow_preference') && Device.where({user_id: opts.recipientId}).fetchAll())
    .then(devices => {
      if (!devices || devices.length === 0) return

      return Comment.find(opts.commentId, {
        withRelated: [
          'user', 'post', 'post.communities', 'post.user', 'post.relatedUsers'
        ]
      })
      .then(comment => {
        var post = comment.relations.post
        var path = url.parse(Frontend.Route.post(post)).path
        var alertText = PushNotification.textForComment(comment, opts.version, opts.recipientId)

        return Promise.map(devices.models, d => d.sendPushNotification(alertText, path))
      })
    })
  }
})

const queueSend = (recipientId, commentId, type, version = 'default') => {
  const fn = `send${type === 'push' ? 'PushNotification' : 'NotificationEmail'}`
  return Queue.classMethod('Comment', fn, {recipientId, commentId, version})
}
