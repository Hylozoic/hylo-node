var postRelations = userId => [
  {creator: qb => qb.column("id", "name", "avatar_url")},
  {communities: qb => qb.column('id', 'name', 'slug', 'avatar_url')},
  "contributions",
  {"contributions.user": qb => qb.column("id", "name", "avatar_url")},
  "followers",
  {"followers.user": qb => qb.column("id", "name", "avatar_url")},
  {media: qb => qb.column('id', 'post_id', 'url')},
  {votes: qb => { // only the user's own vote
    qb.column('id', 'post_id');
    qb.where('user_id', userId);
  }}
]

var postAttributes = post => {
  var creator = post.relations.creator;

  return _.extend(
    _.pick(post.toJSON(), [
      'name',
      'description',
      'fulfilled',
      'media',
      'type',
      'creation_date',
      'last_updated'
    ]),
    {
      id:           Number(post.get("id")), // FIXME no need to number-ize this now that Play's gone
      community:    post.relations.communities.first().pick('id', 'name', 'slug', 'avatar_url'),
      contributors: post.relations.contributions.map(c => c.relations.user.pick('id', 'name', 'avatar_url')),
      followers:    post.relations.followers.map(f => f.relations.user.pick('id', 'name', 'avatar_url')),
      hasMedia:     post.related('media').length > 0,
      myVote:       post.relations.votes.length > 0,
      numComments:  post.get("num_comments"),
      votes:        post.get("num_votes"),
      user: {
        id: Number(creator.get("id")),
        name: creator.get("name"),
        avatar: creator.get("avatar_url")
      }
    }
  );
};

module.exports = {
  relations: postRelations,
  present: postAttributes
};