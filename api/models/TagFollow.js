/* eslint-disable camelcase  */

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

  // toggle is used by hylo-redux
  toggle: function (tagId, userId, communityId) {
    return TagFollow.where({community_id: communityId, tag_id: tagId}).fetch()
    .then(tagFollow => tagFollow
      ? TagFollow.remove({tagId, userId, communityId})
      : TagFollow.add({tagId, userId, communityId}))
  },

  // subscribe is used by hylo-evo
  subscribe: function (tagId, userId, communityId, isSubscribing) {
    return TagFollow.where({community_id: communityId, tag_id: tagId, user_id: userId})
    .fetch()
    .then(tagFollow => {
      if (tagFollow && !isSubscribing) {
        return TagFollow.remove({tagId, userId, communityId})
      } else if (!tagFollow && isSubscribing) {
        return TagFollow.add({tagId, userId, communityId})
      }
    })
  },

  add: function ({tagId, userId, communityId, transacting}) {
    const attrs = {
      tag_id: tagId,
      community_id: communityId,
      user_id: userId
    }
    return new TagFollow(attrs).save(null, {transacting})
    .tap(() => CommunityTag.query(q => {
      q.where('community_id', communityId)
      q.where('tag_id', tagId)
    }).query().increment('followers').transacting(transacting))
  },

  remove: function ({tagId, userId, communityId, transacting}) {
    const attrs = {
      tag_id: tagId,
      community_id: communityId,
      user_id: userId
    }
    return TagFollow.where(attrs)
    .fetch()
    .then(tagFollow => tagFollow &&
      tagFollow.destroy({transacting})
      .tap(() => CommunityTag.query(q => {
        q.where('community_id', attrs.community_id)
        q.where('tag_id', attrs.tag_id)
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
