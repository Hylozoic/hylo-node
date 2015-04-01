var respondWithPosts = function(res, posts) {
  var total = posts.first() ? Number(posts.first().get('total')) : 0;
  res.ok({
    seeds_total: total,
    seeds: posts.map(PostPresenter.present)
  });
};

var findPosts = function(req, res, opts) {
  var params = _.pick(req.allParams(), ['sort', 'limit', 'offset', 'type', 'start_time', 'end_time']),
    sortCol = (params.sort == 'top' ? 'post.num_votes' : 'post.last_updated');

  Promise.props({
    communities: opts.communities,
    users: opts.users,
    type: params.type,
    limit: params.limit,
    offset: params.offset,
    start_time: params.start_time,
    end_time: params.end_time,
    sort: sortCol
  }).then(function(args) {
    return Search.forSeeds(args).fetchAll({
      withRelated: PostPresenter.relations(req.session.userId)
    });
  }).then(function(posts) {
    respondWithPosts(res, posts);
  }).catch(res.serverError.bind(res));
};

module.exports = {

  findOne: function(req, res) {
    res.locals.post.load(PostPresenter.relations(req.session.userId))
    .then(function(post) {
      res.ok(PostPresenter.present(post));
    })
    .catch(res.serverError.bind(res));
  },

  findForUser: function(req, res) {
    findPosts(req, res, {
      users: [req.param('userId')],
      communities: Membership.activeCommunityIds(req.session.userId)
    });
  },

  findForCommunity: function(req, res) {
    if (TokenAuth.isAuthenticated(res)) {
      if (!RequestValidation.requireTimeRange(req, res)) return;
    }

    findPosts(req, res, {communities: [req.param('communityId')]});
  },

  findFollowed: function(req, res) {
    Search.forSeeds({
      follower: req.session.userId,
      limit: req.param('limit'),
      offset: req.param('offset'),
      sort: 'post.last_updated'
    }).fetchAll({
      withRelated: PostPresenter.relations(req.session.userId)
    })
    .then(function(posts) {
      respondWithPosts(res, posts);
    }).catch(res.serverError.bind(res));
  },

  create: function(req, res) {
    var params = _.pick(req.allParams(), ['name', 'type', 'communityId', 'imageUrl']),
        description = RichText.sanitize(req.param('description')),
        creatorId = parseInt(req.session.userId);

    var attrs = {
      name:          params.name,
      description:   description,
      type:          params.type || req.param('postType'),
      creator_id:    creatorId,
      creation_date: new Date(),
      last_updated:  new Date(),
      active:        true,
      num_comments:  0,
      num_votes:     0,
      fulfilled:     false,
      edited:        false
    };

    bookshelf.transaction(function(trx) {
      return new Post(attrs).save(null, {transacting: trx})
        .tap(function (post) {
          var mentioned = RichText.getUserMentions(description),
            followerIds = _.uniq(mentioned.concat(creatorId));

          return Promise.join(
            // Attach post to the community
            new Community({id: params.communityId}).posts().attach(post.id, {transacting: trx}),

            // Add mentioned users and creator as followers
            post.addFollowers(followerIds, creatorId, {transacting: trx}),

            // create activity and send notification to all mentioned users except the creator
            Promise.map(_.without(mentioned, creatorId), function(userId) {
              return Promise.join(
                Queue.addJob('Post.sendNotificationEmail', {
                  recipientId: userId,
                  seedId: post.id
                }),
                Activity.forSeed(post, userId).save({}, {transacting: trx})
              );
            }),

            // Add image, if any
            (params.imageUrl ? Media.create({
              postId: post.id,
              url: params.imageUrl,
              transacting: trx
            }) : null)

          );
        });
    })
    .then(function (post) {
      return post.load(PostPresenter.relations(req.session.userId));
    })
    .then(function (post) {
      res.ok(PostPresenter.present(post));
    })
    .catch(res.serverError.bind(res));
  },

  addFollowers: function(req, res) {
    res.locals.post.load('followers').then(function(post) {
      var added = req.param('userIds').map(function(x) { return parseInt(x) }),
        existing = post.relations.followers.map(function(f) { return f.attributes.user_id });

      return bookshelf.transaction(function(trx) {
        return post.addFollowers(_.difference(added, existing), req.session.userId, {
          transacting: trx,
          createActivity: true
        });
      });
    })
    .then(function() {
      res.ok({});
    })
    .catch(res.serverError.bind(res));
  },

  follow: function(req, res) {
    var userId = req.session.userId, post = res.locals.post;
    Follower.query().where({user_id: userId, post_id: post.id}).count()
    .then(function(rows) {
      if (parseInt(rows[0].count) > 0)
        return post.removeFollower(userId, {createActivity: true}).then(function() {
          res.ok({});
        });

      return post.addFollowers([userId], userId, {createActivity: true}).then(function(follows) {
        return User.find(req.session.userId);
      }).then(function(user) {
        res.ok(_.pick(user.attributes, 'id', 'name', 'avatar_url'));
      });
    })
    .catch(res.serverError.bind(res));
  },

  update: function(req, res) {
    var post = res.locals.post,
      attrs = _.extend(
        _.pick(req.allParams(), 'name', 'description', 'type'),
        {edited: true, edited_timestamp: new Date()}
      );

    bookshelf.transaction(function(trx) {

      return post.save(attrs, {patch: true, transacting: trx})
      .tap(function() {
        var imageUrl = req.param('imageUrl'),
          imageRemoved = req.param('imageRemoved');

        if (!imageUrl && !imageRemoved) return;

        return post.load('media').then(function(post) {
          var media = post.relations.media.first();

          if (media && imageRemoved) { // remove media
            return media.destroy({transacting: trx});

          } else if (media) { // replace url in existing media
            return media.save({url: imageUrl}, {patch: true, transacting: trx});

          } else if (imageUrl) { // create new media
            return Media.create({
              postId: post.id,
              url: imageUrl,
              transacting: trx
            });

          }
        });

      })
    })
    .then(function() {
      res.ok({});
    })
    .catch(function(err) {
      res.serverError(err);
    })
  }

};
