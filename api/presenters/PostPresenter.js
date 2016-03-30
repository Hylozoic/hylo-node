const userColumns = q => q.column('users.id', 'users.name', 'users.avatar_url')

var postRelations = (userId, opts = {}) => {
  var relations = _.filter([
    {user: userColumns},
    {communities: qb => qb.column('community.id', 'name', 'slug', 'avatar_url')},
    'contributions',
    {'contributions.user': userColumns},
    {followers: userColumns},
    'media',
    {relatedUsers: userColumns},
    {responders: qb => qb.column('users.id', 'name', 'avatar_url', 'event_responses.response')},
    'tags',
    (opts.fromProject ? null : {projects: qb => qb.column('projects.id', 'title', 'slug')}),
    (opts.withComments
      ? {comments: qb => qb.column('comment.id', 'text', 'created_at', 'user_id', 'post_id')}
      : null),
    (opts.withComments
      ? {'comments.user': userColumns}
      : null),
    (opts.withVotes
      ? {votes: qb => { // all votes
        qb.column('id', 'post_id', 'user_id')
      }}
      : {votes: qb => { // only the user's own vote
        qb.column('id', 'post_id')
        qb.where('user_id', userId)
      }}),
    (opts.withVotes
      ? {'votes.user': userColumns}
      : null)
  ], x => !!x)
  return relations
}

var postAttributes = (post, userId, opts = {}) => {
  // userId is only used if opts.withVotes, so there are times when this is called with userId=undefined.
  var rel = post.relations

  var extendedPost = _.extend(
    _.pick(post.toJSON(), [
      'id',
      'name',
      'description',
      'fulfilled_at',
      'type',
      'created_at',
      'updated_at',
      'projects',
      'similarity',
      'start_time',
      'end_time',
      'location'
    ]),
    {
      user: rel.user ? rel.user.pick('id', 'name', 'avatar_url') : null,
      communities: rel.communities.map(c => c.pick('id', 'name', 'slug', 'avatar_url', 'banner_url')),
      contributors: rel.contributions.map(c => c.relations.user.pick('id', 'name', 'avatar_url')),
      followers: rel.followers.map(u => u.pick('id', 'name', 'avatar_url')),
      responders: rel.responders.map(u => u.pick('id', 'name', 'avatar_url', 'response')),
      media: rel.media.map(m => m.pick('name', 'type', 'url', 'thumbnail_url', 'width', 'height')),
      numComments: post.get('num_comments'),
      relatedUsers: rel.relatedUsers.map(u => u.pick('id', 'name', 'avatar_url')),
      public: post.get('visibility') === Post.Visibility.PUBLIC_READABLE,
      tag: rel.tags.filter(tag => tag.pivot.get('selected')).map(tag => tag.get('name'))[0] ||
        post.get('type')
    })
  if (opts.withComments) {
    extendedPost.comments = rel.comments.map(c => _.merge(
      c.pick('id', 'text', 'created_at', 'user'),
      {user: c.relations.user.pick('id', 'name', 'avatar_url')}
    ))
  }
  if (opts.withVotes) {
    extendedPost.voters = rel.votes.map(v => v.relations.user.pick('id', 'name', 'avatar_url'))
  } else {
    // for compatability with angular frontend
    extendedPost.votes = post.get('num_votes')
    extendedPost.myVote = rel.votes.length > 0
  }
  return extendedPost
}

module.exports = {
  relations: postRelations,
  present: postAttributes
}
