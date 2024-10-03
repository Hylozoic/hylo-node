/* eslint-disable camelcase  */

module.exports = bookshelf.Model.extend({
  tableName: 'tag_follows',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group)
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
  toggle: function (tagId, userId, groupId) {
    return TagFollow.where({
      group_id: groupId,
      tag_id: tagId,
      user_id: userId
    }).fetch()
    .then(tagFollow => tagFollow
      ? TagFollow.remove({tagId, userId, groupId})
      : TagFollow.add({tagId, userId, groupId}))
  },

  // subscribe is used by hylo-evo
  subscribe: function (tagId, userId, groupId, isSubscribing) {
    return TagFollow.where({group_id: groupId, tag_id: tagId, user_id: userId})
    .fetch()
    .then(tagFollow => {
      if (tagFollow && !isSubscribing) {
        return TagFollow.remove({tagId, userId, groupId})
      } else if (!tagFollow && isSubscribing) {
        return TagFollow.add({tagId, userId, groupId})
      }
    })
  },

  add: function ({tagId, userId, groupId, transacting}) {
    const attrs = {
      tag_id: tagId,
      group_id: groupId,
      user_id: userId
    }

    return TagFollow.where({
      group_id: groupId,
      tag_id: tagId,
      user_id: userId
    }).fetch({transacting})
    .then(follow => follow ||
      new TagFollow(attrs).save(null, {transacting})
      .then(async (tf) => {
        const query = GroupTag.query(q => {
          q.where('group_id', groupId)
          q.where('tag_id', tagId)
        }).query()
        if (transacting) {
          query.transacting(transacting)
        }
        await query.increment('num_followers')
        return tf
      })
     )
  },

  remove: function ({tagId, userId, groupId, transacting}) {
    const attrs = {
      tag_id: tagId,
      group_id: groupId,
      user_id: userId
    }
    return TagFollow.where(attrs)
    .fetch()
    .then(tagFollow => tagFollow &&
      tagFollow.destroy({transacting})
      .then(() => {
        const query = GroupTag.query(q => {
          q.where('group_id', attrs.group_id)
          q.where('tag_id', attrs.tag_id)
        }).query()
        if (transacting) {
          query.transacting(transacting)
        }
        return query.decrement('num_followers')
      })
    )
  },

  findFollowers: function (group_id, tag_id, limit = 3) {
    return TagFollow.query(q => {
      q.where({group_id, tag_id})
      q.limit(limit)
    })
    .fetchAll({withRelated: ['user', 'user.tags']})
    .then(tagFollows => {
      return tagFollows.models.map(tf => tf.relations.user)
    })
  }
})
