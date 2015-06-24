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

  contributions: function () {
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

  projects: function() {
    return this.belongsToMany(Project, 'posts_projects');
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

        var updates = [];
        if (userId !== addingUserId) {
          updates.push(Activity.forFollowAdd(follow, userId).save({}, _.pick(opts, 'transacting')));
          updates.push(User.incNewNotificationCount(userId, opts.transacting));
        }
        if (creatorId !== addingUserId) {
          updates.push(Activity.forFollow(follow, creatorId).save({}, _.pick(opts, 'transacting')));
          updates.push(User.incNewNotificationCount(creatorId, opts.transacting));
        }
        return Promise.all(updates);
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
  },

  isPublicReadable: function() {
    return this.get('visibility') == Post.Visibility.PUBLIC_READABLE;
  },

  updateCommentCount: function(trx) {
    var self = this;
    return Aggregate.count(this.comments(), {transacting: trx})
    .tap(count => self.save({
      num_comments: count,
      updated_at: new Date()
    }, {patch: true, transacting: trx}));
  }

}, {

  Type: {
    REQUEST: 'request',
    OFFER: 'offer',
    INTENTION: 'intention'
  },

  Visibility: {
    DEFAULT: 0,
    PUBLIC_READABLE: 1,
    DRAFT_PROJECT: 2
  },

  countForUser: function(user) {
    return this.query().count().where({creator_id: user.id, active: true})
    .then(function(rows) {
      return rows[0].count;
    });
  },

  isVisibleToUser: function(postId, userId) {
    var communityId;
    return bookshelf.knex('post_community').where({post_id: postId})
    .then(function(results) {
      if (results.length === 0) return false;
      communityId = results[0].community_id;
      return Membership.find(userId, communityId);
    })
    .then(mship => !!mship)
    .then(success => {
      if (success) return true;

      return PostProjectMembership.where({post_id: postId}).fetch()
      .then(ppm => {
        if (!ppm) return false;
        return Project.isVisibleToUser(ppm.get('project_id'), userId);
      });
    })
    .then(success => {
      if (success) return true;

      return Community.find(communityId).then(community => {
        if (community && community.get('network_id')) {
          return Network.containsUser(community.get('network_id'), userId);
        } else {
          return false;
        }
      });
    });
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
      qb.whereRaw('post.created_at between ? and ?', [startTime, endTime]);
      qb.where('post.active', true);
      qb.where('visibility', '!=', Post.Visibility.DRAFT_PROJECT);
    })
  },

  sendNotificationEmail: function(opts) {

    return Promise.join(
      User.find(opts.recipientId),
      Post.find(opts.postId, {withRelated: ['communities', 'creator']})
    )
    .spread(function(recipient, post) {

      var creator = post.relations.creator,
        community = post.relations.communities.first(),
        description = RichText.qualifyLinks(post.get('description')),
        replyTo = Email.postReplyAddress(post.id, recipient.id);

      return Email.sendPostMentionNotification({
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
          post_description:    description,
          post_title:          post.get('name'),
          post_type:           post.get('type'),
          post_url:            Frontend.Route.post(post, community),
          unfollow_url:        Frontend.Route.unfollow(post, community),
          tracking_pixel_url:  Analytics.pixelUrl('Mention in Post', {userId: recipient.id})
        }
      });

    });

  },

  notifyAboutMention: function(post, userId, opts) {
    return Promise.join(
      Queue.classMethod('Post', 'sendNotificationEmail', {
        recipientId: userId,
        postId: post.id
      }),
      Activity.forPost(post, userId).save(null, _.pick(opts, 'transacting')),
      User.incNewNotificationCount(userId, opts.transacting)
    );
  }

});
