import { sanitize } from 'hylo-utils/text'
import { difference, uniq } from 'lodash'
import { simpleUserColumns } from '../../presenters/UserPresenter'
import { normalizeComment } from '../../../lib/util/normalize'

export function validateCommentCreateData (userId, data) {
  return Post.isVisibleToUser(data.postId, userId)
  .then(isVisible => {
    if (isVisible) {
      return Promise.resolve()
    } else {
      throw new Error('post not found')
    }
  })
}

export function createComment (userId, data) {
  return createAndPresentComment(userId, data.text, data.post, data)
}

export default function createAndPresentComment (commenterId, text, post, opts = {}) {
  text = sanitize(text)
  const { parentComment } = opts
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
    .then(comment => Promise.all([
      presentComment(comment).tap(c => isReplyToPost && notifySockets(c, post)),

      (isThread
        ? Queue.classMethod('Comment', 'notifyAboutMessage', {commentId: comment.id})
        : comment.createActivities()),

      isReplyToPost
        ? Promise.join(
            post.addFollowers(newFollowers, commenterId),
          )
        : Promise.join(
            comment.addFollowers(newFollowers, commenterId),
            parentComment.addFollowers(newFollowers, commenterId)
          ),

      Queue.classMethod('Post', 'updateFromNewComment', {
        postId: post.id,
        commentId: comment.id
      })
    ]))
    .then(promises => promises[0])
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

const notifySockets = (comment, post) => {
  if (post.get('type') === Post.Type.THREAD) {
    const followerIds = post.relations.followers.pluck('id')
    return post.pushMessageToSockets(comment, followerIds)
  } else {
    return post.pushCommentToSockets(comment)
  }
}

const createOrUpdateConnections = (userId, existingFollowers) => comment => {
  // Deliberately non-blocking (don't wait for promise to resolve/reject)
  existingFollowers
    .filter(f => f !== userId)
    .forEach(follower => UserConnection.createOrUpdate(userId, follower, 'message'))
}
