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
