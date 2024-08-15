const { GraphQLYogaError } = require('@graphql-yoga/node')

export async function createModerationAction ({ userId, data }) {
  const { groupId, text, anonymous, agreements, platformAgreements, postId } = data
  if (!userId || !postId || !text) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, text })}`)
  const authorized = await Post.isVisibleToUser(postId, userId)
  if (!authorized) throw new GraphQLYogaError("You don't have permission to see this post")

  if (agreements.length === 0 && platformAgreements.length === 0) throw new GraphQLYogaError('No agreements or platform agreements provided; you need to report against at least one of these')

  return ModerationAction.create({ postId, reporterId: userId, groupId, text, anonymous, agreements, platformAgreements })
    .catch((err) => { throw new GraphQLYogaError(`adding of action failed: ${err}`) })
    .then((result) => {
      Queue.classMethod('ModerationAction', 'sendToModerators', {
        moderationActionId: result.id,
        anonymous,
        groupId,
        postId
      })

      Queue.classMethod('ModerationAction', 'sendEmailsPostCreation', {
        reporterId: userId,
        groupId,
        postId
      })

      return result
    })
}

export async function clearModerationAction ({ userId, postId, groupId, moderationActionId }) {
  if (!userId || !postId || !groupId || !moderationActionId) throw new GraphQLYogaError(`Missing required parameters: ${JSON.stringify({ userId, postId, groupId, moderationActionId })}`)

  const post = await Post.find(postId)
  if (!post) throw new GraphQLYogaError('Post does not exist')

  const responsibilities = await Responsibility.fetchForUserAndGroupAsStrings(userId, groupId)

  if (!responsibilities.includes(Responsibility.constants.RESP_MANAGE_CONTENT)) throw new GraphQLYogaError("You don't have permission to moderate this post")

  return ModerationAction.clearAction({ moderationActionId, userId, postId, groupId })
    .then(() => {
      // Add notifications here
      // to reportee
      // to reporter
      // to moderators
      return { success: true }
    })
}

export function recordClickthrough ({ userId, postId }) {
  return Post.find(postId)
    .then(async post => {
      const authorized = await Post.isVisibleToUser(postId, userId)
      if (!authorized) throw new GraphQLYogaError("You don't have permission to see this post")
      return PostUser.clickthroughModeration({ userId, postId })
    })
    .then(() => ({ success: true }))
}
