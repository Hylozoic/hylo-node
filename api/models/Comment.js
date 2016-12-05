import { compact, filter, sum } from 'lodash/fp'
import { markdown } from 'hylo-utils/text'
import decode from 'ent/decode'
import truncate from 'trunc-html'
import { parse } from 'url'

module.exports = bookshelf.Model.extend({
  tableName: 'comments',

  user: function () {
    return this.belongsTo(User)
  },

  post: function () {
    return this.belongsTo(Post)
  },

  text: function () {
    return this.get('text')
  },

  mentions: function () {
    return RichText.getUserMentions(this.text())
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  community: function () {
    return this.relations.post.relations.communities.first()
  },

  tags: function () {
    return this.belongsToMany(Tag).through(CommentTag)
  },

  activities: function () {
    return this.hasMany(Activity)
  },

  comment: function () {
    return this.belongsTo(Comment)
  },

  comments: function () {
    return this.hasMany(Comment, 'comment_id').query({where: {active: true}})
  },

  parentPost: function () {
    if (this.get('post_id')) {
      return this.load('post')
      .then(() => this.relations.post)
    } else if (this.get('comment_id')) {
      return this.load('comment')
      .then(() => this.relations.comment.parentPost())
    } else {
      return Promise.resolve()
    }
  },

  createActivities: function (trx) {    
    return this.load(['post', 'post.followers'])
    .then(() => {
      const followers = this.relations.post.relations.followers.map(follower => ({
        reader_id: follower.id,
        comment_id: this.id,
        post_id: this.relations.post.id,
        actor_id: this.get('user_id'),
        reason: 'newComment'
      }))
      const mentioned = RichText.getUserMentions(this.get('text')).map(mentionedId => ({
        reader_id: mentionedId,
        comment_id: this.id,
        post_id: this.relations.post.id,
        actor_id: this.get('user_id'),
        reason: 'commentMention'
      }))
      const readers = filter(r => r.reader_id !== this.get('user_id'), followers.concat(mentioned))
      return Activity.saveForReasons(readers, trx)
    })
  }
}, {

  find: function (id, options) {
    return Comment.where({id: id}).fetch(options)
  },

  createdInTimeRange: function (collection, startTime, endTime) {
    if (endTime === undefined) {
      endTime = startTime
      startTime = collection
      collection = Comment
    }

    return collection.query(function (qb) {
      qb.whereRaw('comments.created_at between ? and ?', [startTime, endTime])
      qb.where('comments.active', true)
    })
  },

  cleanEmailText: (user, text) => {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const name = user.get('name').toLowerCase()
    const lines = text.split('\n')

    var cutoff
    lines.forEach((line, index) => {
      if (cutoff) return
      line = line.trim()

      if (line.length > 0 && name.startsWith(line.toLowerCase().replace(/^[\- ]*/, ''))) {
        // line contains only the user's name
        cutoff = index
        // also remove the common pattern of two dashes above the name
        if (index > 0 && lines[index - 1].match(/^\-\- ?$/)) {
          cutoff = index - 1
        }
      } else if (line.match(/^-{8}/)) {
        // line contains our divider, possibly followed by the text, "Only text
        // above the dashed line will be included."
        cutoff = index
      } else if (line.match(/(-{4,}.*dashed.line.*$)/)) {
        // line contains the divider at the end
        cutoff = index + 1
        lines[index] = line.replace(/(-{4,}.*dashed.line.*$)/, '')
      }
    })

    const finalText = cutoff ? lines.slice(0, cutoff).join('\n') : text
    return markdown(finalText || '')
  },

  notifyAboutMessage: ({commentId}) =>
    Comment.find(commentId, {withRelated: [
      'post.followers', 'post.lastReads'
    ]})
    .then(comment => {
      const { user_id, post_id, text } = comment.attributes
      const { followers, lastReads } = comment.relations.post.relations
      const recipients = followers.filter(u => u.id !== user_id)
      const user = followers.find(u => u.id === user_id)
      const alert = `${user.get('name')}: ${decode(truncate(text, 140).text).trim()}`
      const path = parse(Frontend.Route.thread({id: post_id})).path

      return Promise.map(recipients, user => {
        // don't notify if the user has read the thread recently.
        const lr = lastReads.find(r => r.get('user_id') === user.id)
        if (!lr || comment.get('created_at') > lr.get('last_read_at')) {
          return user.sendPushNotification(alert, path)
        }
      })
    }),

  sendMessageDigests: (minutes = 10) => {
    const time = new Date(new Date() - minutes * 60000)

    return Post.where('type', Post.Type.THREAD)
    .where('updated_at', '>', time)
    .fetchAll({withRelated: [
      'followers',
      'followers.devices',
      'lastReads',
      {comments: q => {
        q.where('created_at', '>', time)
        q.orderBy('created_at', 'asc')
      }},
      'comments.user'
    ]})
    .then(posts => Promise.all(posts.map(post => {
      const { comments, followers, lastReads } = post.relations
      if (comments.length === 0) return

      return Promise.map(followers.models, user => {
        // don't send to users that have devices (they receive push
        // notifications instead)
        if (user.relations.devices.length > 0) return

        // select comments not written by this user and newer than user's last
        // read time
        const r = lastReads.find(l => l.get('user_id') === user.id)
        const filtered = comments.filter(c =>
          c.get('created_at') > (r ? r.get('last_read_at') : 0) &&
          c.get('user_id') !== user.id)
        if (filtered.length === 0) return

        // here, we assume that all of the messages were sent by 1 other person,
        // so this will have to change when we support group messaging
        const other = filtered[0].relations.user

        return Email.sendMessageDigest({
          email: user.get('email'),
          data: {
            other_person_avatar_url: other.get('avatar_url'),
            other_person_name: other.get('name'),
            thread_url: Frontend.Route.thread(post),
            messages: filtered.map(c => c.get('text'))
          }
        })
      })
      .then(sends => compact(sends).length)
    })))
    .then(postSendCounts => sum(postSendCounts))
  }
})
