import moment from 'moment-timezone'
import { includes } from 'lodash'
import { get, pick, some } from 'lodash/fp'

export const defaultTimezone = 'America/Los_Angeles'

export const defaultTimeRange = type => {
  const today = moment.tz(defaultTimezone).startOf('day').add(12, 'hours')
  switch (type) {
    case 'daily':
      return [today.clone().subtract(1, 'day'), today]
    case 'weekly':
      return [today.clone().subtract(7, 'day'), today]
  }
}

export const isValidPostType = q =>
  q.where(function () {
    this.where('posts.type', 'not in', ['welcome'])
    .orWhere('posts.type', null)
  })

export const relatedUserColumns = (relationName = 'user') => ({
  [relationName]: q => q.column('users.id', 'users.name', 'users.avatar_url')
})

export const shouldSendData = (data, id) =>
  Promise.resolve(
    some(some(x => x), pick(['conversations', 'requests', 'offers', 'events', 'projects'], data)) ||
    Community.find(id).then(c => !!c &&
      get('post_prompt_day', c.get('settings')) === moment.tz(defaultTimezone).day())
  )

export const getPostsAndComments = (community, startTime, endTime) =>
  Promise.props({
    posts: Post.createdInTimeRange(community.posts(), startTime, endTime)
      .query(isValidPostType)
      .fetch({
        withRelated: [
          'selectedTags',
          relatedUserColumns(),
          'children',
          'linkPreview'
        ]
      })
      .then(get('models')),

    comments: Comment.createdInTimeRange(community.comments(), startTime, endTime)
      .query(q => {
        isValidPostType(q)
        q.join('posts', 'posts.id', 'comments.post_id')
        q.where('posts.active', true)
        q.orderBy('id', 'asc')
      })
      .fetch({withRelated: [
        'post',
        'post.selectedTags',
        relatedUserColumns(),
        relatedUserColumns('post.user')
      ]})
      .then(get('models'))

  })

export const getRecipients = (id, type) => {
  if (!includes(['daily', 'weekly'], type)) {
    throw new Error(`invalid recipient type: ${type}`)
  }

  return User.query(q => {
    q.join('communities_users', 'communities_users.user_id', 'users.id')
    q.whereRaw(`users.settings->>'digest_frequency' = '${type}'`)
    q.whereRaw("communities_users.settings->>'send_email' = 'true'")
    q.where({
      'communities_users.community_id': id,
      'communities_users.active': true,
      'users.active': true
    })
  }).fetchAll().then(get('models'))
}
