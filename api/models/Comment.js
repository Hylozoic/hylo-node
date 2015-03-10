var format = require('util').format;

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

  sendNotificationEmail: function(recipientId, commentId, version) {
    // the version argument corresponds to names of versions in SendWithUs

    return Promise.join(
      User.find(recipientId),
      Comment.find(commentId, {
        withRelated: [
          'user', 'post', 'post.communities', 'post.creator'
        ]
      })
    )
    .spread(function(recipient, comment) {

      var seed = comment.relations.post,
        commenter = comment.relations.user,
        creator = seed.relations.creator,
        community = seed.relations.communities.models[0],
        text = comment.get('comment_text'),
        replyTo = Email.seedReplyAddress(seed.id, recipient.id);

      var seedLabel = format('%s %s',
        (recipient.id == creator.id ? 'your' : 'the'), seed.get('type'));

      text = RichText.qualifyLinks(text);

      return Email.sendNewCommentNotification({
        version: version,
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
          seed_label:            seedLabel,
          seed_title:            seed.get('name'),
          seed_url:              Frontend.Route.seed(seed, community) + '?ctt=comment_email',
          unfollow_url:          Frontend.Route.unfollow(seed)
        }
      });

    })

  },

});
