import { DateTime } from 'luxon'
import { includes } from 'lodash'
import { get, pick, some } from 'lodash/fp'

export const defaultTimezone = 'America/Los_Angeles'

export const defaultTimeRange = type => {
  const today = DateTime.now().setZone(defaultTimezone).startOf('day').plus({ hours: 12 })
  switch (type) {
    case 'daily':
      return [today.minus({ days: 1 }), today]
    case 'weekly':
      return [today.minus({ days: 7 }), today]
  }
}

export const isValidPostType = q =>
  q.where(function () {
    this.whereNotIn('posts.type', ['welcome'])
      .orWhere('posts.type', null)
  })

export const relatedUserColumns = (relationName = 'user') => ({
  [relationName]: q => q.column('users.id', 'users.name', 'users.avatar_url')
})

export const shouldSendData = (data, id) =>
  Promise.resolve(
    some(some(x => x), pick(['discussions', 'requests', 'offers', 'events', 'projects', 'resources', 'topicsWithChats', 'postsWithNewComments'], data))
  )

export const getPostsAndComments = (group, startTime, endTime) =>
  Promise.props({
    posts: Post.createdInTimeRange(group.posts(), startTime, endTime)
      .query(isValidPostType)
      .fetch({
        withRelated: [
          'tags',
          relatedUserColumns(),
          'children',
          'linkPreview'
        ]
      })
      .then(get('models')),

    comments: Comment.createdInTimeRange(group.comments(), startTime, endTime)
      .query(q => {
        isValidPostType(q)
        q.join('posts', 'posts.id', 'comments.post_id')
        q.where('posts.active', true)
        q.orderBy('id', 'asc')
      })
      .fetch({
        withRelated: [
          'post',
          relatedUserColumns(),
          relatedUserColumns('post.user')
        ]
      })
      .then(get('models'))

  })

export async function getRecipients (groupId, type) {
  if (!includes(['daily', 'weekly'], type)) {
    throw new Error(`invalid recipient type: ${type}`)
  }

  const group = await Group.find(groupId)
  const recipients = await group.members().query(q => {
    q.whereRaw(`users.settings->>'digest_frequency' = '${type}'`)
    q.whereRaw('(group_memberships.settings->>\'sendEmail\')::boolean = true')
  }).fetch().then(get('models'))

  return recipients
}
