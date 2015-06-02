var findPosts = function(req, res, opts) {
  var params = _.pick(req.allParams(), ['sort', 'limit', 'offset', 'type', 'start_time', 'end_time']),
    sortCol = (params.sort == 'top' ? 'post.num_votes' : 'post.last_updated');

  Promise.props({
    communities: opts.communities,
    project: opts.project,
    users: opts.users,
    type: params.type,
    limit: params.limit,
    offset: params.offset,
    start_time: params.start_time,
    end_time: params.end_time,
    visibility: opts.visibility,
    sort: sortCol
  }).then(function(args) {
    return Search.forPosts(args).fetchAll({
      withRelated: PostPresenter.relations(req.session.userId, opts.relationsOpts)
    });
  })
  .then(PostPresenter.mapPresentWithTotal)
  .then(res.ok)
  .catch(res.serverError);
};

module.exports = {

  findOne: function(req, res) {
    res.locals.post.load(PostPresenter.relations(req.session.userId))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(res.serverError);
  },

  findForUser: function(req, res) {
    findPosts(req, res, {
      users: [req.param('userId')],
      communities: Membership.activeCommunityIds(req.session.userId),
      visibility: (req.session.userId ? null : Post.Visibility.PUBLIC_READABLE)
    });
  },

  findForCommunity: function(req, res) {
    if (TokenAuth.isAuthenticated(res)) {
      if (!RequestValidation.requireTimeRange(req, res)) return;
    }

    findPosts(req, res, {
      communities: [req.param('communityId')],
      visibility: (req.session.userId ? null : Post.Visibility.PUBLIC_READABLE)
    });
  },

  findForProject: function(req, res) {
    findPosts(req, res, {
      project: req.param('projectId'),
      relationsOpts: {fromProject: true}
    });
  },

  findFollowed: function(req, res) {
    Search.forPosts({
      follower: req.session.userId,
      limit: req.param('limit') || 10,
      offset: req.param('offset'),
      sort: 'post.last_updated'
    }).fetchAll({
      withRelated: PostPresenter.relations(req.session.userId)
    })
    .then(PostPresenter.mapPresentWithTotal)
    .then(res.ok)
    .catch(res.serverError);
  },

  findAllForUser: function(req, res) {
    Membership.activeCommunityIds(req.session.userId)
    .then(function(communityIds) {
      return Search.forPosts({
        communities: communityIds,
        limit: req.param('limit') || 10,
        offset: req.param('offset'),
        sort: 'post.last_updated'
      }).fetchAll({
        withRelated: PostPresenter.relations(req.session.userId)
      });
    })
    .then(PostPresenter.mapPresentWithTotal)
    .then(res.ok)
    .catch(res.serverError);
  },

  create: function(req, res) {
    var params = _.pick(req.allParams(), ['name', 'type', 'communityId', 'imageUrl', 'projectId']),
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

    return Community.find(params.communityId).then(function(community) {
      if (community.isNewContentPublic())
        attrs.visibility = Post.Visibility.PUBLIC_READABLE;
    })
    .tap(() => {
      if (params.projectId) {
        return Project.find(params.projectId).then(project => {
          if (project.isDraft())
            attrs.visibility = Post.Visibility.DRAFT_PROJECT;
        })
      }
    })
    .then(function(community) {
      return bookshelf.transaction(function(trx) {
        return new Post(attrs).save(null, {transacting: trx})
        .tap(post => {
          // Attach post to project, if any
          if (params.projectId)
            return PostProjectMembership.create(post.id, params.projectId, {transacting: trx});
        })
        .tap(post => {
          var mentioned = RichText.getUserMentions(description),
            followerIds = _.uniq(mentioned.concat(creatorId));

          return Promise.join(
            // Attach post to the community
            new Community({id: params.communityId}).posts().attach(post.id, {transacting: trx}),

            // Add mentioned users and creator as followers
            post.addFollowers(followerIds, creatorId, {transacting: trx}),

            // create activity and send notification to all mentioned users except the creator
            Promise.map(_.without(mentioned, creatorId), userId =>
              Post.notifyAboutMention(post, userId, {transacting: trx})),

            // Add image, if any
            (params.imageUrl ? Media.create({
              postId: post.id,
              url: params.imageUrl,
              transacting: trx
            }) : null),

            // Send notifications to project contributors if applicable
            (params.projectId ? Queue.addJob('Project.notifyAboutNewPost', {
              projectId: params.projectId,
              postId: post.id,
              exclude: mentioned
            }) : null)

          );

        });
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
      var added = req.param('userIds').map(Number),
        existing = post.relations.followers.map(f => f.get('user_id'));

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
      if (parseInt(rows[0].count) > 0 || req.param('force') === 'unfollow')
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

      });
    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  fulfill: function(req, res) {
    bookshelf.transaction(function(trx) {

      return res.locals.post.save({
        fulfilled: true,
        date_fulfilled: new Date()
      }, {patch: true, transacting: trx})
      .tap(function() {
        return Promise.map(req.param('contributors'), function(userId) {
          return new Contribution({
            post_id: res.locals.post.id,
            user_id: userId,
            date_contributed: new Date()
          }).save(null, {transacting: trx});
        });
      });

    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  vote: function(req, res) {
    res.locals.post.votes().query({where: {user_id: req.session.userId}}).fetchOne()
    .then(function(vote) {
      if (vote) {
        return vote.destroy();
      } else {
        return new Vote({
          post_id: res.locals.post.id,
          user_id: req.session.userId
        }).save();
      }
    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  },

  destroy: function(req, res) {
    return bookshelf.transaction(function(trx) {

      // FIXME this post will still be accessible via activity about a comment
      return Promise.join(
        Activity.where('post_id', res.locals.post.id).destroy({transacting: trx}),
        res.locals.post.save({active: false}, {patch: true, transacting: trx})
      );

    })
    .then(() => res.ok({}))
    .catch(res.serverError);
  }

};
