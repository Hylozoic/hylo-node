import { includes } from 'lodash'
import { get, isNull, isUndefined, pickBy } from 'lodash/fp'
import { normalizePost } from '../../lib/util/normalize'

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
        qb.column('comments.id', 'text', 'created_at', 'user_id', 'post_id')
        qb.orderBy('comments.id', 'desc')
        if (opts.withComments === 'recent') qb.where('recent', true)
      }},
      {'comments.user': userColumns},
      'comments.media',
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
  } else if (userId) {
    relations.push(
      {votes: qb => { // only the user's own vote
        qb.column('id', 'post_id')
        qb.where('user_id', userId)
      }}
    )
  }

  if (opts.withChildren) {
    relations.push({
      children: q => {
        q.column('id', 'parent_post_id', 'name', 'description', 'num_comments', 'is_project_request')
      }
    })
  }

  if (opts.withReadTimes) {
    relations.push({lastReads: q => q.where('user_id', userId)})
  }

  return relations
}

const showValidType = type =>
  includes(Post.Type, type) ? type : null

var postAttributes = (post, userId, opts = {}) => {
  // userId is only used if opts.withVotes, so there are times when this is
  // called with userId=undefined.

  const {
    user, communities, media, followers, contributions, responders, comments,
    relatedUsers, tags, votes, children, linkPreview, lastReads
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
      'starts_at',
      'ends_at',
      'location',
      'parent_post_id'
    ]),
    {
      user: user ? user.pick('id', 'name', 'avatar_url', 'bio') : null,
      communities: (communities || []).map(c => c.pick('id', 'name', 'slug', 'avatar_url', 'banner_url')),
      contributors: contributions.length > 0 ? contributions.map(c => c.relations.user.pick('id', 'name', 'avatar_url')) : null,
      followers: followers.map(u => u.pick('id', 'name', 'avatar_url')),
      responders: isEvent ? responders.map(u => u.pick('id', 'name', 'avatar_url', 'response')) : null,
      media: media.length > 0 ? media.map(m => m.pick('name', 'type', 'url', 'thumbnail_url', 'width', 'height')) : null,
      numComments: post.get('num_comments'),
      relatedUsers: isWelcome ? relatedUsers.map(u => u.pick('id', 'name', 'avatar_url')) : null,
      public: (post.get('visibility') === Post.Visibility.PUBLIC_READABLE) || null,
      tag: tags.filter(tag => tag.pivot.get('selected')).map(tag => tag.get('name'))[0] ||
        type,
      type: showValidType(post.get('type')),
      linkPreview: get('id', linkPreview) ? linkPreview : null,
      last_read_at: lastReads && lastReads.first() ? lastReads.first().get('last_read_at') : null
    })
  if (opts.withComments) {
    extendedPost.comments = comments.map(CommentPresenter.present)
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
    {communities: qb => qb.column('communities.id', 'name', 'slug', 'avatar_url', 'banner_url')}
  ])
}

const postListRelations = (userId, opts = {}) => {
  return postRelations(userId, opts).concat([
    {user: userColumns},
    {communities: qb => qb.column('communities.id', 'name', 'slug')}
  ])
}

const presentProjectActivity = function (post, data, userId, relationsOpts) {
  if (post.type !== 'project') return post
  return Post.query(q => {
    q.where({parent_post_id: post.id})
    q.orderBy('updated_at', 'desc')
    q.limit(1)
  })
  .fetch({withRelated: postListRelations(userId, relationsOpts || {})})
  .then(child => {
    if (!child || Math.abs(post.updated_at.getTime() - child.get('updated_at').getTime()) > 10000) return post
    child = postAttributes(child, userId, relationsOpts)
    post.child = child
    normalizePost(child, data)
    return post
  })
}

module.exports = {
  relations: postDetailRelations,
  present: postAttributes,
  relationsForList: postListRelations,
  presentForList: postAttributes,
  presentProjectActivity
}
