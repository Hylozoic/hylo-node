/* eslint-disable camelcase */
/* globals RedisClient */
import decode from 'ent/decode'
import truncate from 'trunc-html'
import { parse } from 'url'
import { compact, some, sum } from 'lodash/fp'

export const notifyAboutMessage = ({commentId}) =>
  Comment.find(commentId, {withRelated: [
    'post.followers', 'post.lastReads', 'media'
  ]})
  .then(comment => {
    const { user_id, post_id, text } = comment.attributes
    const { followers, lastReads } = comment.relations.post.relations
    const recipients = followers.filter(u => u.id !== user_id)
    const user = followers.find(u => u.id === user_id)
    const alert = comment.relations.media.length !== 0
      ? `${user.get('name')} sent an image`
      : `${user.get('name')}: ${decode(truncate(text, 140).text).trim()}`
    const path = parse(Frontend.Route.thread({id: post_id})).path

    return Promise.map(recipients, user => {
      // don't notify if the user has read the thread recently and respect the
      // dm_notifications setting.
      if (!user.enabledNotification(Notification.TYPE.Message, Notification.MEDIUM.Push)) return

      const lr = lastReads.find(r => r.get('user_id') === user.id)
      if (!lr || comment.get('created_at') > lr.get('last_read_at')) {
        return user.sendPushNotification(alert, path)
      }
    })
  })

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
      'followers',
      'lastReads',
      {comments: q => {
        q.where('created_at', '>', time)
        q.orderBy('created_at', 'asc')
      }},
      'comments.user',
      'comments.media'
    ]}))
  .then(posts => Promise.all(posts.map(post => {
    const { comments, followers, lastReads } = post.relations
    if (comments.length === 0) return []

    return Promise.map(followers.models, user => {
      // select comments not written by this user and newer than user's last
      // read time.
      const r = lastReads.find(l => l.get('user_id') === user.id)
      const filtered = comments.filter(c =>
        c.get('created_at') > (r ? r.get('last_read_at') : 0) &&
        c.get('user_id') !== user.id)

      if (filtered.length === 0) return

      if (post.get('type') === Post.Type.THREAD) {
        if (!user.enabledNotification(Notification.TYPE.Message, Notification.MEDIUM.Email)) return

        // here, we assume that all of the messages were sent by 1 other person,
        // so this will have to change when we support group messaging
        const other = filtered[0].relations.user

        const presentMessage = comment =>
          comment.relations.media.length !== 0
          ? {image: comment.relations.media.first().pick('url', 'thumbnail_url')}
          : comment.get('text')

        return Email.sendMessageDigest({
          email: user.get('email'),
          data: {
            other_person_avatar_url: other.get('avatar_url'),
            other_person_name: other.get('name'),
            thread_url: Frontend.Route.thread(post),
            messages: filtered.map(presentMessage)
          },
          sender: {
            reply_to: Email.postReplyAddress(post.id, user.id)
          }
        })
      } else {
        if (!user.enabledNotification(Notification.TYPE.Comment, Notification.MEDIUM.Email)) return

        const presentComment = comment => {
          const attrs = {
            text: RichText.qualifyLinks(comment.get('text')),
            user: comment.relations.user.pick('name', 'avatar_url'),
            url: Frontend.Route.post(post) + `#comment-${comment.id}`
          }
          if (comment.relations.media.length !== 0) {
            attrs.image = comment.relations.media.first().pick('url', 'thumbnail_url')
          }
          return attrs
        }

        const commentData = comments.map(presentComment)
        const hasMention = ({ text }) =>
          RichText.getUserMentions(text).includes(user.id)

        return Email.sendCommentDigest({
          email: user.get('email'),
          data: {
            post_title: truncate(post.get('name'), 140).text,
            post_url: Frontend.Route.post(post),
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

sendDigests.REDIS_TIMESTAMP_KEY = 'Comment.sendDigests.lastSentAt'
