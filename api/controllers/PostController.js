var postRelations = [
  {"creator": function(qb) {
    qb.column("id", "name", "avatar_url");
  }},
  {"communities": function(qb) {
    qb.column("id", 'name', "slug");
  }},
  "followers",
  {"followers.user": function(qb) {
    qb.column("id", "name", "avatar_url");
  }},
  "contributors",
  {"contributors.user": function(qb) {
    qb.column("id", "name", "avatar_url");
  }},
  {media: function(qb) {
    qb.column('id', 'post_id', 'url');
  }}
];

var postAttributes = function(post, hasVote) {

  var followers = post.related("followers").map(function(follower) {
    return _.pick(follower.relations.user.attributes, 'id', 'name', 'avatar_url');
  });

  var contributors = post.related("contributors").map(function(contributor) {
    return _.pick(contributor.relations.user.attributes, 'id', 'name', 'avatar_url');
  });

  var standardAttributes = _.pick(post.toJSON(), [
    'name', 'description', 'fulfilled', 'media', 'type'
  ]);

  var nonStandardAttributes = {
    id: Number(post.get("id")),
    postType: post.get("type"),
    user: {
      id: Number(post.related("creator").get("id")),
      name: post.related("creator").get("name"),
      avatar: post.related("creator").get("avatar_url")
    },
    creationDate: post.get("creation_date"),
    votes: post.get("num_votes"),
    numComments: post.get("num_comments"),
    contributors: contributors,
    communitySlug: post.related("communities").first().get("slug"),
    cName: post.related("communities").first().get("name"),
    community: {
      id: post.related("communities").first().id
    },
    myVote: hasVote,
    comments: [], // TODO Load Comments?
    commentsLoaded: false,
    followers: followers,
    followersLoaded: true,
    numFollowers: followers.length,
    hasMedia: post.related('media').length > 0
  };

  return _.extend(standardAttributes, nonStandardAttributes);
};

var textSearch = function(qb, term) {
  var query = _.chain(term.split(/\s*\s/)) // split on whitespace
    .map(function(word) { // Remove any invalid characters
      return word.replace(/[,;'|:&()!]+/, '');
    })
    .reject(_.isEmpty)
    .reduce(function(result, word, key) { // Build the tsquery string using logical | (OR) operands
      result += " | " + word;
      return result;
    }).value();

  qb.where(function() {
    this.whereRaw("(to_tsvector('english', post.name) @@ to_tsquery(?)) OR " +
      "(to_tsvector('english', post.description) @@ to_tsquery(?))", [query, query]);

    //this.where("name", "ILIKE", query).orWhere("description", "ILIKE", query ) // Basic 'icontains' searching
  });
};

var findPosts = function(req, res, opts) {
  var params = _.pick(req.allParams(), ['sort', 'limit', 'start', 'postType', 'q', 'start_time', 'end_time']),
    sortCol = (params.sort == 'top' ? 'num_votes' : 'last_updated');

  opts.findParent.then(function(parent) {

    return parent.posts().query(function(qb) {
      if (params.postType && params.postType != 'all') {
        qb.where({type: params.postType});
      }
      qb.where({active: true});

      if (params.q && params.q.trim().length > 0) {
        textSearch(qb, params.q.trim());
      }

      if (opts.isOther) {
        qb.join("post_community", "post_community.post_id", "=", "post.id");
        qb.join("community", "community.id", "=", "post_community.community_id");
        qb.whereIn("community.id", Membership.activeCommunityIds(req.session.userId));
      }

      qb.orderBy(sortCol, 'desc');
      qb.limit(params.limit);
      qb.offset(params.start);

      if (params.start_time && params.end_time) {
        qb.whereRaw('((post.creation_date between ? and ?) or (post.last_updated between ? and ?))',
          [params.start_time, params.end_time, params.start_time, params.end_time]);
      }

    }).fetch({
      withRelated: postRelations
    });

  }).then(function(posts) {

    var postIds = posts.pluck("id");
    return Promise.props({
      posts: posts,
      votes: Vote.forUserInPosts(req.session.userId, postIds).pluck("post_id")
    });

  }).then(function(data) {

    res.ok(data.posts.map(function(post) {
      return postAttributes(post, _.contains(data.votes, post.get("id")));
    }));

  }).catch(function(err) {
    res.serverError(err);
  });
};

module.exports = {

  findOne: function(req, res) {
    res.locals.post.load(postRelations)
    .then(function(post) {
      return Promise.join(post, post.userVote(req.session.userId));
    })
    .spread(function(post, vote) {
      res.ok(postAttributes(post, !!vote));
    })
    .catch(function(err) {
      res.serverError(err);
    });
  },

  findForUser: function(req, res) {
    findPosts(req, res, {
      findParent: User.find(req.param('userId')),
      isOther: req.session.userId != req.param('userId')
    });
  },

  findForCommunity: function(req, res) {
    if (TokenAuth.isAuthenticated(res)) {
      if (!RequestValidation.requireTimeRange(req, res)) return;
    }

    findPosts(req, res, {findParent: Community.find(req.param('communityId'))});
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
      return post.load(postRelations);
    })
    .then(function (post) {
      res.ok(postAttributes(post, false));
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
