import { sanitize } from 'hylo-utils/text'
import { difference, uniq } from 'lodash'
import { postRoom, pushToSockets, userRoom } from '../../services/Websockets'
import { refineOne, refineMany } from '../util/relations'

export default function createComment (commenterId, opts = {}) {
  let { text, post, parentComment } = opts
  text = sanitize(text)
  const isReplyToPost = !parentComment

  var attrs = {
    text: text,
    created_at: new Date(),
    recent: true,
    user_id: commenterId,
    post_id: post.id,
    active: true,
    created_from: opts.created_from || null
  }

  if (!isReplyToPost) {
    attrs.comment_id = parentComment.id
  }

  return (isReplyToPost ? post.load('followers') : parentComment.load('followers'))
  .then(() => {
    var existingFollowers, isThread
    const mentioned = RichText.getUserMentions(text)

    if (isReplyToPost) {
      existingFollowers = post.relations.followers.pluck('id')
      isThread = post.get('type') === Post.Type.THREAD
    } else {
      existingFollowers = parentComment.relations.followers.pluck('id')
      isThread = false
    }

    const newFollowers = difference(uniq(mentioned.concat(commenterId)), existingFollowers)

    return bookshelf.transaction(trx =>
      new Comment(attrs).save(null, {transacting: trx})
      .tap(comment => Tag.updateForComment(comment, opts.tagDescriptions, commenterId, trx))
      .tap(createMedia(opts.imageUrl, trx)))
    .tap(createOrUpdateConnections(commenterId, existingFollowers))
    .tap(comment => isReplyToPost
      ? post.addFollowers(newFollowers, commenterId)
      : Promise.join(
          comment.addFollowers(newFollowers, commenterId),
          parentComment.addFollowers(newFollowers, commenterId)
        ))
    .tap(comment => Promise.all([
      isReplyToPost && notifySockets(comment, post, isThread),

      (isThread
        ? Queue.classMethod('Comment', 'notifyAboutMessage', {commentId: comment.id})
        : comment.createActivities()),

      Queue.classMethod('Post', 'updateFromNewComment', {
        postId: post.id,
        commentId: comment.id
      })
    ])
    .then(() => comment))
  })
}

const createMedia = (url, transacting) => comment =>
  url && Media.create({
    comment_id: comment.id,
    url,
    thumbnailSize: 128,
    transacting
  })

function notifySockets (comment, post, isThread) {
  if (isThread) return pushMessageToSockets(comment, post)
  return pushCommentToSockets(comment)
}

export function pushMessageToSockets (message, thread) {
  const { followers } = thread.relations
  const userIds = followers.pluck('id')
  const excludingSender = userIds.filter(id => id !== message.get('user_id'))

  console.log('pushing message with date', message.get('created_at'))

  let response = refineOne(message,
    ['id', 'text', 'created_at', 'user_id', 'post_id'],
    {
      user_id: 'creator',
      post_id: 'messageThread'
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
        post: comment.get('post_id')
      }
    )
  ))
}

const createOrUpdateConnections = (userId, existingFollowers) => comment => {
  return existingFollowers
    .filter(f => f !== userId)
    .forEach(follower => UserConnection.createOrUpdate(userId, follower, 'message'))
}
