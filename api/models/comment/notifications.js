/* eslint-disable camelcase */
/* globals RedisClient */
import decode from 'ent/decode'
import truncate from 'trunc-html'
import { parse } from 'url'
import { compact, some, sum } from 'lodash/fp'

export async function notifyAboutMessage ({ commentId }) {
  const comment = await Comment.find(commentId, {withRelated: ['media']})
  const post = await Post.find(comment.get('post_id'))
  const followers = await post.followersWithPivots().fetch()

  const { user_id, post_id, text } = comment.attributes
  const recipients = followers.filter(u => u.id !== user_id)
  const user = followers.find(u => u.id === user_id)
  const alert = comment.relations.media.length !== 0
    ? `${user.get('name')} sent an image`
    : `${user.get('name')}: ${decode(truncate(text, 140).text).trim()}`
  const path = parse(Frontend.Route.thread({id: post_id})).path

  return Promise.map(recipients, async user => {
    // don't notify if the user has read the thread recently and respect the
    // dm_notifications setting.
    if (!user.enabledNotification(Notification.TYPE.Message, Notification.MEDIUM.Push)) return

    const lastReadAt = user.pivot.getSetting('lastReadAt')
    if (!lastReadAt || comment.get('created_at') > new Date(lastReadAt)) {
      return user.sendPushNotification(alert, path)
    }
  })
}

export const sendDigests = () => {
  const redis = RedisClient.create()
  const now = new Date()
  const fallbackTime = () => new Date(now - 10 * 60000)

  return redis.getAsync(sendDigests.REDIS_TIMESTAMP_KEY)
  .then(i => i ? new Date(Number(i)) : fallbackTime())
  .catch(() => fallbackTime())
  .then(time =>
    Post.where('updated_at', '>', time)
    .fetchAll({withRelated: [
      {comments: q => {
        q.where('created_at', '>', time)
        q.orderBy('created_at', 'asc')
      }},
      'user',
      'comments.user',
      'comments.media'
    ]}))
  .then(posts => Promise.all(posts.map(async post => {
    const { comments } = post.relations
    if (comments.length === 0) return []

    const followers = await post.followersWithPivots().fetch()

    return Promise.map(followers.models, user => {
      // select comments not written by this user and newer than user's last
      // read time.
      let lastReadAt = user.pivot.getSetting('lastReadAt')
      if (lastReadAt) lastReadAt = new Date(lastReadAt)

      const filtered = comments.filter(c =>
        c.get('created_at') > (lastReadAt || 0) &&
        c.get('user_id') !== user.id)

      if (filtered.length === 0) return

      const presentComment = comment => {
        const presented = {
          name: comment.relations.user.get('name'),
          avatar_url: comment.relations.user.get('avatar_url')
        }
        return comment.relations.media.length !== 0
          ? Object.assign({}, presented, {image: comment.relations.media.first().pick('url', 'thumbnail_url')})
          : Object.assign({}, presented, {text: comment.get('text')})
      }

      if (post.get('type') === Post.Type.THREAD) {
        if (!user.enabledNotification(Notification.TYPE.Message, Notification.MEDIUM.Email)) return

        const others = filtered.map(comment => comment.relations.user)

        const otherNames = others.map(other => other.get('name'))

        const otherAvatarUrls = others.map(other => other.get('avatar_url'))

        var participantNames = otherNames.slice(0, otherNames.length - 1).join(', ') +
        ' & ' + otherNames[otherNames.length - 1]

        return Email.sendMessageDigest({
          email: user.get('email'),
          data: {
            count: filtered.length,
            other_avatar_urls: otherAvatarUrls,
            participant_avatars: otherAvatarUrls[0],
            participant_names: participantNames,
            other_names: otherNames,
            thread_url: Frontend.Route.thread(post),
            messages: filtered.map(presentComment)
          },
          sender: {
            reply_to: Email.postReplyAddress(post.id, user.id)
          }
        })
      } else {
        if (!user.enabledNotification(Notification.TYPE.Comment, Notification.MEDIUM.Email)) return

        const commentData = comments.map(presentComment)
        const hasMention = ({ text }) =>
          RichText.getUserMentions(text).includes(user.id)

        return Email.sendCommentDigest({
          email: user.get('email'),
          data: {
            count: commentData.length,
            post_title: truncate(post.get('name'), 140).text,
            post_creator_avatar_url: post.relations.user.get('avatar_url'),
            thread_url: Frontend.Route.post(post),
            comments: commentData,
            subject_prefix: some(hasMention, commentData)
              ? 'You were mentioned in'
              : 'New comments on'
          },
          sender: {
            reply_to: Email.postReplyAddress(post.id, user.id)
          }
        })
      }
    })
    .then(sends => compact(sends).length)
  })))
  .tap(() => redis.setAsync(sendDigests.REDIS_TIMESTAMP_KEY, now.getTime()))
  .then(sum)
}

// we keep track of the last time we sent comment digests in Redis, so that the
// next time we send them, we can exclude any comments that were created before
// the last send.
sendDigests.REDIS_TIMESTAMP_KEY = 'Comment.sendDigests.lastSentAt'
