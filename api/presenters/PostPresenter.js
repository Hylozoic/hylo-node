import { includes } from 'lodash'
import { get, isNull, isUndefined, pickBy } from 'lodash/fp'

const userColumns = q => q.column('users.id', 'users.name', 'users.avatar_url')

var postRelations = (userId, opts = {}) => {
  var relations = [
    'contributions',
    {'contributions.user': userColumns},
    {followers: userColumns},
    'media',
    {relatedUsers: userColumns},
    'tags',
    {responders: q => q.column('users.id', 'name', 'avatar_url', 'event_responses.response')},
    {linkPreview: q => q.column('id', 'title', 'description', 'url', 'image_url', 'image_width', 'image_height')}
  ]

  if (opts.withComments) {
    relations.push(
      {comments: qb => {
        qb.column('comment.id', 'text', 'created_at', 'user_id', 'post_id')
        qb.orderBy('comment.id', 'desc')
        if (opts.withComments === 'recent') qb.where('recent', true)
      }},
      {'comments.user': userColumns},
      {'comments.thanks.thankedBy': userColumns}
    )
  }

  if (opts.withVotes) {
    relations.push(
      {votes: qb => { // all votes
        qb.column('id', 'post_id', 'user_id')
      }},
      {'votes.user': userColumns}
    )
  } else {
    relations.push(
      {votes: qb => { // only the user's own vote
        qb.column('id', 'post_id')
        qb.where('user_id', userId)
      }}
    )
  }

  if (opts.withChildren) {
    relations.push(
      {children: q => {
        q.column('id', 'parent_post_id', 'name', 'description', 'num_comments')
      }}
    )
  }

  return relations
}

const showValidType = type =>
  includes(['event', 'project', 'welcome', 'message'], type) ? type : null

var postAttributes = (post, userId, opts = {}) => {
  // userId is only used if opts.withVotes, so there are times when this is
  // called with userId=undefined.

  const {
    user, communities, media, followers, contributions, responders, comments,
    relatedUsers, tags, votes, children, linkPreview
  } = post.relations
  const type = post.get('type')
  const isEvent = type === 'event'
  const isWelcome = type === 'welcome'

  var extendedPost = _.extend(
    _.pick(post.toJSON(), [
      'id',
      'name',
      'description',
      'fulfilled_at',
      'created_at',
      'updated_at',
      'similarity',
      'start_time',
      'end_time',
      'location',
      'parent_post_id'
    ]),
    {
      user: user ? user.pick('id', 'name', 'avatar_url', 'bio') : null,
      communities: communities.map(c => c.pick('id', 'name', 'slug', 'avatar_url', 'banner_url')),
      contributors: contributions.length > 0 ? contributions.map(c => c.relations.user.pick('id', 'name', 'avatar_url')) : null,
      followers: followers.map(u => u.pick('id', 'name', 'avatar_url')),
      responders: isEvent ? responders.map(u => u.pick('id', 'name', 'avatar_url', 'response')) : null,
      media: media.length > 0 ? media.map(m => m.pick('name', 'type', 'url', 'thumbnail_url', 'width', 'height')) : null,
      numComments: post.get('num_comments'),
      relatedUsers: isWelcome ? relatedUsers.map(u => u.pick('id', 'name', 'avatar_url')) : null,
      public: (post.get('visibility') === Post.Visibility.PUBLIC_READABLE) || null,
      pinned: post.get('pinned') || null,
      tag: tags.filter(tag => tag.pivot.get('selected')).map(tag => tag.get('name'))[0] ||
        type,
      type: showValidType(post.get('type')),
      linkPreview: get('id', linkPreview) ? linkPreview : null
    })
  if (opts.withComments) {
    extendedPost.comments = comments.map(c => _.merge(
      c.pick('id', 'text', 'created_at', 'user'),
      {
        user: c.relations.user.pick('id', 'name', 'avatar_url'),
        thanks: c.relations.thanks.map(t => t.relations.thankedBy)
      }
    ))
  }
  if (opts.withVotes) {
    extendedPost.voters = votes.map(v => v.relations.user.pick('id', 'name', 'avatar_url'))
  }
  if (opts.withChildren) {
    extendedPost.children = children
  }
  if (opts.forCommunity && post.get('pinned')) {
    extendedPost.memberships = {[opts.forCommunity]: {pinned: post.get('pinned')}}
  }
  return pickBy(x => !isNull(x) && !isUndefined(x), extendedPost)
}

const postDetailRelations = (userId, opts = {}) => {
  return postRelations(userId, opts).concat([
    {user: q => q.column('users.id', 'users.name', 'users.avatar_url', 'bio')},
    {communities: qb => qb.column('community.id', 'name', 'slug', 'avatar_url', 'banner_url')}
  ])
}

const postListRelations = (userId, opts = {}) => {
  return postRelations(userId, opts).concat([
    {user: userColumns},
    {communities: qb => qb.column('community.id', 'name', 'slug')}
  ])
}

module.exports = {
  relations: postDetailRelations,
  present: postAttributes,
  relationsForList: postListRelations,
  presentForList: postAttributes
}
