import data from '@emoji-mart/data'
import { init, getEmojiDataFromNative } from 'emoji-mart'
import { TextHelpers } from 'hylo-shared'
import { notifyAboutMessage, sendDigests } from './comment/notifications'
import EnsureLoad from './mixins/EnsureLoad'
import * as RichText from '../services/RichText'

init({ data })

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'comments',
  requireFetch: false,
  hasTimestamps: ['created_at', null],

  user: function () {
    return this.belongsTo(User)
  },

  post: function () {
    return this.belongsTo(Post)
  },

  mentions: function () {
    return RichText.getUserMentions(this.text())
  },

  text: function (forUserId) {
    return RichText.processHTML(this.get('text'), { forUserId })
  },

  thanks: function () {
    return this.hasMany(Thank)
  },

  group: async function () {
    await this.relations.post.load(['groups'])
    return this.relations.post.relations.groups.first()
  },

  commentReactions: function () {
    return this.hasMany(Reaction, 'entity_id').where('reactions.entity_type', 'comment')
  },

  reactions: function () {
    return this.hasMany(Reaction, 'entity_id').where('reactions.entity_type', 'comment')
  },

  reactionsForUser: function (userId) {
    return userId
      ? this.reactions().query({ where: { 'reactions.user_id': userId } })
      : this.reactions()
  },

  tags: function () {
    return this.belongsToMany(Tag).through(CommentTag)
  },

  activities: function () {
    return this.hasMany(Activity)
  },

  parentComment: function () {
    return this.belongsTo(Comment).where('comments.active', true)
  },

  addReaction: async function (userId, emojiFull) {
    return bookshelf.transaction(async trx => {
      const userReactionsModels = await this.reactionsForUser(userId).fetch({ transacting: trx })
      const userReactions = userReactionsModels.models
      const userReaction = userReactions.filter(reaction => reaction.attributes?.emoji_full === emojiFull)[0]

      if (!userReaction) {
        const emojiObject = await getEmojiDataFromNative(emojiFull)

        await new Reaction({
          date_reacted: new Date(),
          entity_id: this.id,
          user_id: userId,
          emoji_base: emojiFull,
          emoji_full: emojiFull,
          entity_type: 'comment',
          emoji_label: emojiObject.shortcodes
        }).save({}, { transacting: trx })

        return this
      }
      return false
    })
  },

  deleteReaction: function (userId, emojiFull) {
    return bookshelf.transaction(async trx => {
      const userReactionsModels = await this.reactionsForUser(userId).fetch({ transacting: trx })
      const userReactions = userReactionsModels.models
      const userReaction = userReactions.filter(reaction => reaction.attributes?.emoji_full === emojiFull)[0]

      if (userReaction) {
        await userReaction.destroy({ transacting: trx })
        return this
      }
      return false
    })
  },

  childComments: function () {
    return this.hasMany(Comment, 'comment_id').query({where: {'comments.active': true}})
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
    const toLoad = ['post']

    await this.ensureLoad(toLoad)
    const actorId = this.get('user_id')
    const followers = await this.relations.post.followers().fetch()
    const groupId = await this.group().id
    const mentionedIds = RichText.getUserMentions(this.get('text'))

    const createActivity = reason => id => ({
      reader_id: id,
      actor_id: actorId,
      comment_id: this.id,
      parent_comment_id: this.get('comment_id') || null,
      post_id: this.relations.post.id,
      group_id: groupId,
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
    return opts.useMarkdown ? TextHelpers.markdown(finalText || '', { disableAutolinking: true }) : finalText
  },

  notifyAboutMessage,
  sendDigests
})
