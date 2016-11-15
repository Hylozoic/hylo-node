import { get } from 'lodash/fp'

const getTag = idOrInstance =>
  get('attributes', idOrInstance)
    ? Promise.resolve(idOrInstance)
    : Tag.find(idOrInstance)

const getCommunity = idOrInstance =>
  get('attributes', idOrInstance)
    ? Promise.resolve(idOrInstance)
    : Community.find(idOrInstance)

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

  toggle: function (tagIdOrName, userId, communityId) {
    return lookup(tagIdOrName, userId, communityId)
    .then(({ error, instance, attrs }) => !error &&
      (instance ? instance.destroy() : new TagFollow(attrs).save()))
  },

  add: function (tagIdOrName, userId, communityId) {
    return lookup(tagIdOrName, userId, communityId)
    .then(({ error, instance, attrs }) => !error &&
      (instance || new TagFollow(attrs).save()))
  },

  remove: function (tagIdOrName, userId, communityId) {
    return lookup(tagIdOrName, userId, communityId)
    .then(({ error, instance }) => !error && instance && instance.destroy())
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
