/* eslint-disable camelcase  */
import { get } from 'lodash/fp'

const isBookshelfInstance = obj => !!get('attributes', obj)

const flexibleFind = model => idOrInstance =>
  isBookshelfInstance(idOrInstance)
    ? Promise.resolve(idOrInstance)
    : model.find(idOrInstance)

const getTag = flexibleFind(Tag)
const getCommunity = flexibleFind(Community)

const lookup = (tagIdOrInstance, user_id, communityIdOrInstance) =>
  Promise.join(
    getTag(tagIdOrInstance),
    getCommunity(communityIdOrInstance),
    (tag, community) => {
      if (!tag) return {error: true}
      const attrs = {community_id: community.id, tag_id: tag.id, user_id}
      return Promise.props({attrs, instance: TagFollow.where(attrs).fetch()})
    })

module.exports = bookshelf.Model.extend({
  tableName: 'tag_follows',

  community: function () {
    return this.belongsTo(Community)
  },

  tag: function () {
    return this.belongsTo(Tag)
  },

  user: function () {
    return this.belongsTo(User)
  }

}, {
  create (attrs, { transacting } = {}) {
    return this.forge(Object.assign({created_at: new Date()}, attrs))
    .save({}, {transacting})
  },

  toggle: function (tagIdOrName, userId, communityId) {
    return lookup(tagIdOrName, userId, communityId)
    .then(({ error, instance, attrs }) => !error &&
      (instance
        ? TagFollow.remove({tagIdOrName, userId, communityId})
        : TagFollow.add({tagIdOrName, userId, communityId})))
  },

  add: function ({tagIdOrName, userId, communityId, transacting}) {
    return lookup(tagIdOrName, userId, communityId)
    .then(({ error, instance, attrs }) => !error &&
      (instance ||
      new TagFollow(attrs).save({transacting})
      .then(() => CommunityTag.query(q => {
        q.where('community_id', communityId)
        q.where('tag_id', tagIdOrName)
      }).query().increment('followers').transacting(transacting))))
  },

  remove: function ({tagIdOrName, userId, communityId, transacting}) {
    return lookup(tagIdOrName, userId, communityId)
    .then(({ error, instance }) => !error &&
      instance &&
      instance.destroy({transacting})
      .then(() => CommunityTag.query(q => {
        q.where('community_id', communityId)
        q.where('tag_id', tagIdOrName)
      }).query().decrement('followers').transacting(transacting)))
  },

  findFollowers: function (community_id, tag_id, limit = 3) {
    return TagFollow.query(q => {
      q.where({community_id, tag_id})
      q.limit(limit)
    })
    .fetchAll({withRelated: ['user', 'user.tags']})
    .then(tagFollows => {
      return tagFollows.models.map(tf => tf.relations.user)
    })
  }
})
