var format = require('util').format;

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

  addFollowers: function(userIds, addingUserId, opts) {
    var postId = this.id, creatorId = this.get('creator_id');
    if (!opts) opts = {};

    return Promise.map(userIds, function(userId) {
      return Follower.create(postId, {
        followerId: userId,
        addedById: addingUserId,
        transacting: opts.transacting
      }).tap(function(follow) {
        if (!opts.createActivity) return;

        return Promise.join(
          // notify users they have been added as followers
          (userId === addingUserId ?
            null :
            Activity.forFollowAdd(follow, userId).save({}, _.pick(opts, 'transacting'))
          ),

          // notify creator that people have joined
          (creatorId === addingUserId ?
            null :
            Activity.forFollow(follow, creatorId).save({}, _.pick(opts, 'transacting'))
          )
        );
      });
    });
  },

  removeFollower: function(userId, opts) {
    var self = this;
    return Follower.where({user_id: userId, post_id: this.id}).destroy()
    .tap(function() {
      if (!opts.createActivity) return;
      return Activity.forUnfollow(self, userId).save();
    });
  }

}, {

  countForUser: function(user) {
    return bookshelf.knex('post').count().where({creator_id: user.id}).then(function(rows) {
      return rows[0].count;
    });
  },

  isVisibleToUser: function(postId, userId) {
    return bookshelf.knex('post_community').then(function(results) {
      var communityId = results[0].community_id;
      return Membership.find(userId, communityId);
    }).then(function(mship) { return !!mship });
  },

  find: function(id, options) {
    return Post.where({id: id}).fetch(options);
  },

  createdInTimeRange: function(collection, startTime, endTime) {
    if (endTime == undefined) {
      endTime = startTime;
      startTime = collection;
      collection = Post;
    }
    return collection.query(function(qb) {
      qb.whereRaw('post.creation_date between ? and ?', [startTime, endTime]);
      qb.where('active', true);
    })
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
