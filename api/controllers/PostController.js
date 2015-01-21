var Promise = require('bluebird');

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
  }}
];

var postAttributes = function(post, hasVote) {

  var followers = post.related("followers").map(function(follower) {
    return {
      "value": Number(follower.related("user").get("id")),
      "name": follower.related("user").get("name"),
      "avatar": follower.related("user").get("avatar_url")
    }
  });

  var contributors = post.related("contributors").map(function(contributor) {
    return {
      "id": Number(contributor.related("user").get("id")),
      "name": contributor.related("user").get("name"),
      "avatar": contributor.related("user").get("avatar_url")
    };
  });

  return {
    "id": Number(post.get("id")),
    "name": post.get("name"),
    "description": post.get("description"),
    "postType": post.get("type"),
    "imageUrl": post.get("image_url"),
    "user": {
      "id": Number(post.related("creator").get("id")),
      "name": post.related("creator").get("name"),
      "avatar": post.related("creator").get("avatar_url")
    },
    "creationDate": post.get("creation_date"),
    "votes": post.get("num_votes"),
    "numComments": post.get("num_comments"),
    "fulfilled": post.get("fulfilled"),
    "contributors": contributors,
    "communitySlug": post.related("communities").first().get("slug"),
    "cName": post.related("communities").first().get("name"),
    "myVote": hasVote,
    "comments": [], // TODO Load Comments?
    "commentsLoaded": false,
    "followers": followers,
    "followersLoaded": true,
    "numFollowers": followers.length
  }
};

var findPosts = function(req, res, opts) {
  var params = _.pick(req.allParams(), ['sort', 'limit', 'start', 'postType', 'q']),
    sortCol = (params.sort == 'top' ? 'num_votes' : 'last_updated');

  opts.findParent.then(function(parent) {

    return parent.posts().query(function(qb) {
      if (params.postType && params.postType != 'all') {
        qb.where({type: params.postType});
      }
      qb.where({active: true});

      if (params.q && params.q.trim().length > 0) {
        var query = _.chain(params.q.trim().split(/\s*\s/)) // split on whitespace
          .map(function(term) { // Remove any invalid characters
            return term.replace(/[,;'|:&()!]+/, '');
          })
          .reject(_.isEmpty)
          .reduce(function(result, term, key) { // Build the tsquery string using logical | (OR) operands
            result += " | " + term;
            return result;
          }).value();

        qb.where(function() {
          this.whereRaw("(to_tsvector('english', post.name) @@ to_tsquery(?)) OR (to_tsvector('english', post.description) @@ to_tsquery(?))", [query, query]);
          //this.where("name", "ILIKE", query).orWhere("description", "ILIKE", query ) // Basic 'icontains' searching
        });
      }

      if (opts.isOther) {
        qb.join("post_community", "post_community.post_id", "=", "post.id");
        qb.join("community", "community.id", "=", "post_community.community_id");
        qb.whereIn("community.id", Membership.activeCommunityIds(req.session.userId));
      }

      qb.orderBy(sortCol, 'desc');
      qb.limit(params.limit);
      qb.offset(params.start);
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

  });
};

module.exports = {
  findForUser: function(req, res) {
    findPosts(req, res, {
      findParent: User.find(req.param('userId')),
      isOther: req.session.userId != req.param('userId')
    });
  },

  findForCommunity: function(req, res) {
    findPosts(req, res, {findParent: Community.find(req.param('communityId'))});
  },

  create: function(req, res) {
    var params = _.pick(req.allParams(), ['name', 'description', 'postType', 'communityId']),
        cleanDescription = RichText.sanitize(params.description),
        mentions = RichText.getUserMentions(cleanDescription);

    bookshelf.transaction(function(trx) {
      return new Post({
        name: params.name,
        description: cleanDescription,
        type: params.postType,
        creator_id: req.session.userId,
        creation_date: new Date(),
        last_updated: new Date(),
        active: true,
        num_comments: 0,
        num_votes: 0,
        fulfilled: false,
        edited: false
      }).save(null, {transacting: trx})
        .tap(function (post) {
          // Attach post to the community
          return new Community({id: params.communityId}).posts().attach(post.id, {transacting: trx});
        })
        .tap(function (post) {
          // Add any followers to new post
          return post.addFollowers(mentions, req.session.userId, trx);
        })
        .tap(function (post) {
          // Add seed creator as a follower
          return Follower.create(post.id, {
            followerId: req.session.userId,
            addedById: req.session.userId,
            transacting: trx
          });
        })
        .then(function (post) {
          return post.load(postRelations, {transacting: trx});
        });
    }).then(function (post) {
      res.ok(postAttributes(post, false));
    }).catch(function (err) {
      res.serverError(err);
    });
  }

};
