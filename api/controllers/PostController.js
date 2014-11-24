var Promise = require('bluebird');

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
    "communitySlug": post.related("community").first().get("slug"),
    "cName": post.related("community").first().get("name"),
    "myVote": hasVote,
    "comments": [], // TODO Load Comments?
    "commentsLoaded": false,
    "followers": followers,
    "followersLoaded": true,
    "numFollowers": followers.length
  }
};

module.exports = {
  find: function(req, res) {
    var params = _.pick(req.allParams(), ['sort', 'limit', 'start', 'postType']),
      sortCol = (params.sort == 'top' ? 'num_votes' : 'last_updated');

    Community.withId(req.param('id')).then(function(community) {

      return community.posts().query(function(qb) {
        if (params.postType && params.postType != 'all') {
          qb.where({type: params.postType});
        }
        qb.where({active: true});
        qb.orderBy(sortCol, 'desc');
        qb.limit(params.limit);
        qb.offset(params.start);
      }).fetch({
        withRelated: [{"creator": function(qb) {
          qb.column("id", "name", "avatar_url")
        }}, {"community": function(qb) {
          qb.column("id", 'name', "slug")
        }}, "followers", {"followers.user": function(qb) {
          qb.column("id", "name", "avatar_url")
        }}, "contributors", {"contributors.user": function(qb){
          qb.column("id", "name", "avatar_url")
        }}]
      });

    }).then(function(posts) {

      var postIds = posts.pluck("id");
      return Promise.props({
        posts: posts,
        votes: Vote.forUserInPosts(req.session.user.id, postIds).pluck("post_id")
      });

    }).then(function(data) {

      res.ok(data.posts.map(function(post) {
        return postAttributes(post, _.contains(data.votes, post.get("id")));
      }));

    });
  }
}
