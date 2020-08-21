/* eslint-disable camelcase */
import { markdown } from 'hylo-utils/text'
import { notifyAboutMessage, sendDigests } from './comment/notifications'
import EnsureLoad from './mixins/EnsureLoad'

module.exports = bookshelf.Model.extend(Object.assign({
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

  community: async function () {
    await this.relations.post.load(['communities'])
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

  media: function (type) {
    const relation = this.hasMany(Media)
    return type ? relation.query({where: {type}}) : relation
  },

  getTagsInComments: function (opts) {
    // this is part of the 'taggable' interface, shared with Post
    return Promise.resolve([])
  },

  createActivities: async function (trx) {
    var toLoad = ['post']

    await this.ensureLoad(toLoad)
    const actorId = this.get('user_id')
    const followers = await this.relations.post.followers().fetch()
    const communityId = await this.community().id
    const mentionedIds = RichText.getUserMentions(this.get('text'))

    const createActivity = reason => id => ({
      reader_id: id,
      actor_id: actorId,
      comment_id: this.id,
      parent_comment_id: this.get('comment_id') || null,
      post_id: this.relations.post.id,
      community_id: communityId,
      reason
    })

    const newCommentActivities = followers
    .filter(u => u.id !== actorId)
    .map(u => u.id)
    .map(createActivity('newComment'))

    const mentionActivities = mentionedIds
    .filter(u => u.id !== actorId)
    .map(createActivity('commentMention'))

    return Activity.saveForReasons(
      newCommentActivities.concat(mentionActivities), trx)
  }
}, EnsureLoad), {

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
