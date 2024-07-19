import { flatten, difference, uniq } from 'lodash'
import { postRoom, pushToSockets, userRoom } from '../../services/Websockets'
import { refineOne, refineMany } from '../util/relations'

export default async function createComment (commenterId, opts = {}) {
  let { text, post, parentComment } = opts

  var attrs = {
    text: text,
    created_at: new Date(),
    recent: true,
    user_id: commenterId,
    post_id: post.id,
    comment_id: parentComment ? parentComment.id : null,
    active: true,
    created_from: opts.created_from || null
  }

  var existingFollowers, isThread
  const mentioned = RichText.getUserMentions(text)

  existingFollowers = await post.followers().fetch().then(f => f.pluck('id'))
  isThread = post.get('type') === Post.Type.THREAD

  const newFollowers = difference(uniq(mentioned.concat(commenterId)), existingFollowers)

  return bookshelf.transaction(async (trx) => {
    const comment = await new Comment(attrs).save(null, {transacting: trx})
    await createMedia(comment, opts, trx)
    return comment
  }).then(async (comment) => {
    await createOrUpdateConnections(commenterId, existingFollowers)
    await post.addFollowers(newFollowers)
    await notifySockets(comment, post, isThread)
    if (isThread) {
      await Queue.classMethod('Comment', 'notifyAboutMessage', {commentId: comment.id})
    } else {
      await comment.createActivities()
    }

    await Queue.classMethod('Post', 'updateFromNewComment', {
      postId: post.id,
      commentId: comment.id
    })
    return comment
  })
}

export const createMedia = (comment, opts, trx) => {
  return Promise.all(flatten([
    opts.attachments && Promise.map(opts.attachments, (attachment, i) =>
      Media.createForSubject({
        subjectType: 'comment',
        subjectId: comment.id,
        type: attachment.attachmentType,
        url: attachment.url,
        position: i
      }, trx)),
  ]))
}

function notifySockets (comment, post, isThread) {
  if (isThread) return pushMessageToSockets(comment, post)
  return pushCommentToSockets(comment)
}

export async function pushMessageToSockets (message, thread) {
  const followers = await thread.followers().fetch().then(x => x.models)
  const userIds = followers.map(x => x.id)
  const excludingSender = userIds.filter(id => id !== message.get('user_id'))

  let response = refineOne(message,
    ['id', 'text', 'created_at', 'user_id', 'post_id', 'comment_id'],
    {
      user_id: 'creator',
      post_id: 'messageThread',
      comment_id: 'parentComment'
    }
  )

  response.createdAt = response.createdAt && response.createdAt.toString()

  let socketMessageName

  if (thread.get('num_comments') === 0) {
    response = Object.assign(
      {
        participants: refineMany(followers, ['id', 'name', 'avatar_url']),
        messages: [response]
      },
      refineOne(thread, ['id', 'created_at', 'updated_at'])
    )
    socketMessageName = 'newThread'
  } else {
    socketMessageName = 'messageAdded'
  }

  return Promise.map(excludingSender, userId =>
    pushToSockets(userRoom(userId), socketMessageName, response))
}

function pushCommentToSockets (comment) {
  return comment.ensureLoad('user')
  .then(() => pushToSockets(
    postRoom(comment.get('post_id')),
    'commentAdded',
    Object.assign({},
      refineOne(comment, ['id', 'text', 'created_at']),
      {
        creator: refineOne(comment.relations.user, ['id', 'name', 'avatar_url']),
        post: comment.get('post_id'),
        parentComment: comment.get('comment_id')
      }
    )
  ))
}

const createOrUpdateConnections = (userId, existingFollowers) => {
  return existingFollowers
    .filter(f => f !== userId)
    .forEach(follower => UserConnection.createOrUpdate(userId, follower, 'message'))
}
