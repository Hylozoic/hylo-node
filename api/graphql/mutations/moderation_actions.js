import ModerationAction from '../../models/ModerationAction'

const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function createModerationAction ({ userId, data }) {
  let result
  const { groupId, text, anonymous, agreements, platformAgreements, postId } = data
  if (!userId || !postId || !text) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, text })}`)

  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to see this post")

  if (agreements.length === 0 && platformAgreements.length === 0) throw new GraphQLYogaError('No agreements or platform agreements provided; you need to report against at least one of these')

  return ModerationAction.create({ postId, reporterId: userId, groupId, text, anonymous, agreements, platformAgreements })
    .then(async moderationAction => {
      result = moderationAction
      Post.addToFlaggedGroups({ postId, groupId })
    })
    .catch((err) => { throw new GraphQLYogaError(`adding of action failed: ${err}`) })
    .then(() => result)
}

export async function clearModerationAction ({ userId, postId, groupId, moderationActionId }) {
  if (!userId || !postId || !groupId || !moderationActionId) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, groupId, moderationActionId })}`)

  const post = await Post.find(postId)
  if (!post) throw new GraphQLYogaError('Post does not exist')

  const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)

  if (post.get('user_id') !== userId && responsibilities.includes(Responsibility.constants.RESP_MANAGE_CONTENT)) throw new GraphQLYogaError("You don't have permission to modify this post")

  return ModerationAction.clearAction({ moderationActionId })
    .then(() => Post.removeFromFlaggedGroups({ postId, groupId }))
    .then(() => ({ success: true }))
}

export function recordClickThrough ({ userId, postId }) {
  return Post.find(postId)
    .then(post => {
      if (post.get('user_id') !== userId) {
        throw new GraphQLYogaError("You don't have permission to modify this post")
      }
      return post.clickthroughModeration()
    })
    .then(() => ({ success: true }))
}
