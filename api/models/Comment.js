var url = require('url');

module.exports = bookshelf.Model.extend({
  tableName: 'comment',

  user: function() {
    return this.belongsTo(User);
  },

  post: function() {
    return this.belongsTo(Post);
  },

  text: function() {
    return this.get('comment_text');
  },

  mentions: function() {
    return RichText.getUserMentions(this.text());
  },

  thanks: function() {
    return this.hasMany(Thank);
  },

  community: function() {
    return this.relations.post.relations.communities.first();
  }

}, {

  find: function(id, options) {
    return Comment.where({id: id}).fetch(options);
  },

  createdInTimeRange: function(collection, startTime, endTime) {
    if (endTime == undefined) {
      endTime = startTime;
      startTime = collection;
      collection = Comment;
    }

    return collection.query(function(qb) {
      qb.whereRaw('comment.date_commented between ? and ?', [startTime, endTime]);
      qb.where('comment.active', true);
    })
  },

  sendNotificationEmail: function(opts) {
    // opts.version corresponds to names of versions in SendWithUs

    return Promise.join(
      User.find(opts.recipientId),
      Comment.find(opts.commentId, {
        withRelated: [
          'user', 'post', 'post.communities', 'post.creator'
        ]
      })
    )
    .spread(function(recipient, comment) {

      if (!comment) return;

      var post = comment.relations.post,
        commenter = comment.relations.user,
        creator = post.relations.creator,
        community = post.relations.communities.models[0],
        text = RichText.qualifyLinks(comment.get('comment_text')),
        replyTo = Email.postReplyAddress(post.id, recipient.id);

      var postLabel = format('%s %s',
        (recipient.id == creator.id ? 'your' : 'the'), post.get('type'));

      return Email.sendNewCommentNotification({
        version: opts.version,
        email: recipient.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: format('%s (via Hylo)', commenter.get('name'))
        },
        data: {
          community_name:        community.get('name'),
          commenter_name:        commenter.get('name'),
          commenter_avatar_url:  commenter.get('avatar_url'),
          commenter_profile_url: Frontend.Route.profile(commenter) + '?ctt=comment_email',
          comment_text:          text,
          post_label:            postLabel,
          post_title:            post.get('name'),
          post_url:              Frontend.Route.post(post, community) + '?ctt=comment_email',
          unfollow_url:          Frontend.Route.unfollow(post, community),
          tracking_pixel_url:    Analytics.pixelUrl('Comment', {userId: recipient.id})
        }
      });

    })

  },

  sendPushNotification: function(userId, comment, version, options) {

    return Device.where({user_id: userId}).fetchAll(options)
    .then(devices => {
      if (devices.length === 0)
        return;
      
      var post = comment.relations.post,
        commenter = comment.relations.user,
        creator = post.relations.creator,
        community = post.relations.communities.models[0],
        path = url.parse(Frontend.Route.post(post,community)).path,
        alertText;
      
      switch (version) {
      case 'mention':
        alertText = commenter.get("name") + " mentioned you in a comment";
        break;
      default:
        alertText = commenter.get("name") + " commented on \"" + post.get("name") + "\"";
      };
      
      return Promise.map(devices.models, d => d.sendPushNotification(alertText, path, options));
    });
  },

});
