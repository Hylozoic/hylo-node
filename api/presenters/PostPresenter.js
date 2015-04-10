var postRelations = function(userId) {
  return [
    {"creator": function(qb) {
      qb.column("id", "name", "avatar_url");
    }},
    {"communities": function(qb) {
      qb.column('id', 'name', 'slug', 'avatar_url');
    }},
    "followers",
    {"followers.user": function(qb) {
      qb.column("id", "name", "avatar_url");
    }},
    "contributions",
    {"contributions.user": function(qb) {
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
    return follower.relations.user.pick('id', 'name', 'avatar_url');
  });

  var contributors = post.related("contributions").map(function(contribution) {
    return contribution.relations.user.pick('id', 'name', 'avatar_url');
  });

  var standardAttributes = _.pick(post.toJSON(), [
    'name', 'description', 'fulfilled', 'media', 'type', 'creation_date', 'last_updated'
  ]);

  var community = post.relations.communities.first(),
    creator = post.relations.creator;

  var nonStandardAttributes = {
    id: Number(post.get("id")),
    user: {
      id: Number(creator.get("id")),
      name: creator.get("name"),
      avatar: creator.get("avatar_url")
    },
    votes: post.get("num_votes"),
    numComments: post.get("num_comments"),
    contributors: contributors,
    community: community.pick('id', 'name', 'slug', 'avatar_url'),
    myVote: post.relations.votes.length > 0,
    followers: followers,
    hasMedia: post.related('media').length > 0
  };

  return _.extend(standardAttributes, nonStandardAttributes);
};

module.exports = {
  relations: postRelations,
  present: postAttributes
};