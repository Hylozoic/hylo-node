var format = require('util').format,
  Promise = require('bluebird');

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
  }
}, {

  find: function(id, options) {
    return Comment.where({id: id}).fetch(options);
  },

  sendNotificationEmail: function(recipientId, commentId, version) {
    // version corresponds to names of versions in SendWithUs

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
        poster = seed.relations.creator,
        community = seed.relations.communities.models[0],
        text = comment.get('comment_text');

      var seedLabel = format('%s %s',
        (recipient.id == poster.id ? 'your' : 'the'), seed.get('type'));

      text = RichText.qualifyLinks(text);

      return Email.sendNewCommentNotification({
        version: version,
        email: recipient.get('email'),
        sender: {
          address: Email.seedReplyAddress(seed.id, recipient.id),
          name: format('%s (via Hylo)', commenter.get('name'))
        },
        data: {
          community_name:        community.get('name'),
          commenter_name:        commenter.get('name'),
          commenter_avatar_url:  commenter.get('avatar_url'),
          commenter_profile_url: Frontend.Route.profile(commenter),
          comment_text:          text,
          seed_label:            seedLabel,
          seed_title:            seed.get('name'),
          seed_url:              Frontend.Route.seed(seed, community),
          unfollow_url:          Frontend.Route.unfollow(seed)
        }
      })

    })



  },

});
