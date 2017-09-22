import { sanitize } from 'hylo-utils/text'
import { difference, uniq } from 'lodash'
import { simpleUserColumns } from '../../presenters/UserPresenter'
import { normalizeComment, normalizedSinglePostResponse } from '../../../lib/util/normalize'
import { postRoom, pushToSockets, userRoom } from '../../services/Websockets'

export function createComment (userId, data) {
  const opts = Object.assign({}, data, {returnRaw: true})
  return createAndPresentComment(userId, data.text, data.post, opts)
}

export default function createAndPresentComment (commenterId, text, post, opts = {}) {
  console.log('TEXT UNSANITIZED', text)
  text = sanitize(text)
  console.log('TEXT SANITIZED', text)
  const { parentComment, returnRaw } = opts
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
    .then(comment => Promise.all([
      presentComment(comment).tap(c => isReplyToPost && notifySockets(c, post)),

      (isThread
        ? Queue.classMethod('Comment', 'notifyAboutMessage', {commentId: comment.id})
        : comment.createActivities()),

      Queue.classMethod('Post', 'updateFromNewComment', {
        postId: post.id,
        commentId: comment.id
      })
    ])
    .then(promises => returnRaw ? comment : promises[0]))
  })
}

const createMedia = (url, transacting) => comment =>
  url && Media.create({
    comment_id: comment.id,
    url,
    thumbnailSize: 128,
    transacting
  })

const presentComment = comment =>
  comment.load([{user: simpleUserColumns}, 'media'])
  .then(c => CommentPresenter.present(c))
  .then(c => {
    const buckets = {people: []}
    normalizeComment(c, buckets, true)
    return Object.assign(buckets, c)
  })

function notifySockets (comment, post) {
  if (post.get('type') === Post.Type.THREAD) {
    const followerIds = post.relations.followers.pluck('id')
    return pushMessageToSockets(post, comment, followerIds)
  }

  return pushCommentToSockets(post, comment)
}

// n.b.: `message` has already been formatted for presentation
export function pushMessageToSockets (thread, message, userIds) {
  const excludingSender = userIds.filter(id => id !== message.user_id.toString())

  if (thread.get('num_comments') === 0) {
    return Promise.map(excludingSender, userId => {
      const opts = {withComments: 'all'}
      return thread.load(PostPresenter.relations(userId, opts))
      .then(post => PostPresenter.present(post, userId, opts))
      .then(normalizedSinglePostResponse)
      .then(post => pushToSockets(userRoom(userId), 'newThread', post))
    })
  }

  return Promise.map(excludingSender, id =>
    pushToSockets(userRoom(id), 'messageAdded', {postId: thread.id, message}))
}

function pushCommentToSockets (post, comment) {
  return pushToSockets(postRoom(post.id), 'commentAdded', {comment, postId: post.id})
}

const createOrUpdateConnections = (userId, existingFollowers) => comment => {
  return existingFollowers
    .filter(f => f !== userId)
    .forEach(follower => UserConnection.createOrUpdate(userId, follower, 'message'))
}
