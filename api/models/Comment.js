import { filter } from 'lodash/fp'
import { markdown } from 'hylo-utils/text'

module.exports = bookshelf.Model.extend({
  tableName: 'comment',

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
      qb.whereRaw('comment.created_at between ? and ?', [startTime, endTime])
      qb.where('comment.active', true)
    })
  },

  cleanEmailText: (user, text) => {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const name = user.get('name').toLowerCase()
    const lines = text.split('\n')

    var cutoff
    lines.forEach((line, index) => {
      line = line.trim()

      if (line.length > 0 && name.startsWith(line.toLowerCase())) {
        // line contains only the user's name
        cutoff = index
        if (index > 0 && lines[index - 1].match(/^\-\- ?$/)) {
          cutoff = index - 1
        }
      } else if (line.match(/^[-\*]{3,}$/)) {
        // line contains only dashes or asterisks
        cutoff = index
      } else if (line.match(/^-{8}/)) {
        // line contains our divider, possibly followed by the text, "(Only text
        // above the dashed line will be included.)"
        cutoff = index
      }
    })

    const finalText = cutoff ? lines.slice(0, cutoff).join('\n') : text
    return markdown(finalText || '')
  }
})
