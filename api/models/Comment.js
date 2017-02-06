/* eslint-disable camelcase */
import { filter } from 'lodash/fp'
import { markdown } from 'hylo-utils/text'
import { addFollowers } from './post/util'
import { notifyAboutMessage, sendDigests } from './comment/notifications'

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

  followers: function () {
    return this.belongsToMany(User).through(Follow).withPivot('added_by_id')
  },

  media: function () {
    return this.hasMany(Media)
  },

  childTags: function (opts) {
    // this is part of the 'taggable' interface, shared with Post
    return Promise.resolve([])
  },

  createActivities: function (trx) {
    const isReplyToPost = !this.get('comment_id')

    var toLoad = ['post', 'post.followers']
    if (!isReplyToPost) toLoad = toLoad.concat(['comment', 'comment.followers'])

    return this.load(toLoad)
    .then(() => {
      const followers = this.relations[isReplyToPost ? 'post' : 'comment'].relations.followers
      const followerActivities = followers.map(follower => ({
        reader_id: follower.id,
        comment_id: this.id,
        parent_comment_id: this.get('comment_id') || null,
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
      const readers = filter(r => r.reader_id !== this.get('user_id'), followerActivities.concat(mentioned))
      return Activity.saveForReasons(readers, trx)
    })
  },

  addFollowers: function (userIds, addedById, opts = {}) {
    return this.load('post')
    .then(() => addFollowers(this.relations.post, this, userIds, addedById, opts))
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

  cleanEmailText: (user, text, opts = { useMarkdown: true }) => {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const name = user.get('name').toLowerCase()
    const lines = text.split('\n')

    var cutoff
    lines.forEach((line, index) => {
      if (cutoff) return
      line = line.trim()

      if (line.length > 0 && name.startsWith(line.toLowerCase().replace(/^[- ]*/, ''))) {
        // line contains only the user's name
        cutoff = index
        // also remove the common pattern of two dashes above the name
        if (index > 0 && lines[index - 1].match(/^-- ?$/)) {
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
    return opts.useMarkdown ? markdown(finalText || '') : finalText
  },

  notifyAboutMessage,
  sendDigests
})
