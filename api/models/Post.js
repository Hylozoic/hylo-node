var format = require('util').format,
  Promise = require('bluebird');

module.exports = bookshelf.Model.extend({
  tableName: 'post',

  creator: function () {
    return this.belongsTo(User, "creator_id");
  },

  communities: function () {
    return this.belongsToMany(Community, 'post_community', 'post_id', 'community_id');
  },

  followers: function () {
    return this.hasMany(Follower, "post_id");
  },

  contributors: function () {
    return this.hasMany(Contribution, "post_id");
  },

  comments: function () {
    return this.hasMany(Comment, "post_id").query({where: {active: true}});
  },

  media: function () {
    return this.hasMany(Media);
  },

  votes: function () {
    return this.hasMany(Vote);
  },

  userVote: function (userId) {
    return this.votes().query({where: {user_id: userId}}).fetchOne();
  },

  addFollowers: function(userIds, addingUserId, transaction) {
    var postId = this.id;
    return Promise.map(userIds, function(userId) {
      return Follower.create(postId, {
        followerId: userId,
        addedById: addingUserId,
        transacting: transaction
      });
    });
  }

}, {

  countForUser: function(user) {
    return bookshelf.knex('post').count().where({creator_id: user.id}).then(function(rows) {
      return rows[0].count;
    });
  },

  find: function(id, options) {
    return Post.where({id: id}).fetch(options);
  },

  queueNotificationEmail: function(recipientId, seedId) {
    var queue = require('kue').createQueue();

    var job = queue.create('Post.sendNotificationEmail', {
      recipientId: recipientId,
      seedId: seedId
    })
    .delay(5000) // because the job is queued while an object it depends upon hasn't been saved yet
    .attempts(3)
    .backoff({delay: 5000, type: 'exponential'});

    return Promise.promisify(job.save, job)();
  },

  sendNotificationEmail: function(recipientId, seedId) {

    return Promise.join(
      User.find(recipientId),
      Post.find(seedId, {withRelated: ['communities', 'creator']})
    )
    .spread(function(recipient, seed) {

      var creator = seed.relations.creator,
        community = seed.relations.communities.first(),
        description = RichText.qualifyLinks(seed.get('description')),
        replyTo = Email.seedReplyAddress(seed.id, recipient.id);

      return Email.sendSeedMentionNotification({
        email: recipient.get('email'),
        sender: {
          address: replyTo,
          reply_to: replyTo,
          name: format('%s (via Hylo)', creator.get('name'))
        },
        data: {
          community_name:      community.get('name'),
          creator_name:        creator.get('name'),
          creator_avatar_url:  creator.get('avatar_url'),
          creator_profile_url: Frontend.Route.profile(creator),
          seed_description:    description,
          seed_title:          seed.get('name'),
          seed_type:           seed.get('type'),
          seed_url:            Frontend.Route.seed(seed, community),
          unfollow_url:        Frontend.Route.unfollow(seed)
        }
      });

    });

  }

});
