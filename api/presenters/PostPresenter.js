var postRelations = function(userId) {
  return [
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
    }},
    {votes: function(qb) { // only the user's own vote
      qb.column('id', 'post_id');
      qb.where('user_id', userId);
    }}
  ];
};

var postAttributes = function(post) {

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
    myVote: post.relations.votes.length > 0,
    comments: [], // TODO Load Comments?
    commentsLoaded: false,
    followers: followers,
    followersLoaded: true,
    numFollowers: followers.length,
    hasMedia: post.related('media').length > 0
  };

  return _.extend(standardAttributes, nonStandardAttributes);
};

module.exports = {
  relations: postRelations,
  present: postAttributes
};