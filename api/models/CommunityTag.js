module.exports = bookshelf.Model.extend({
  tableName: 'communities_tags',

  owner: function () {
    return this.belongsTo(User, 'user_id')
  },

  community: function () {
    return this.belongsTo(Community)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }

}, {

  create (attrs, { transacting } = {}) {
    return this.forge(Object.assign({created_at: new Date()}, attrs))
    .save({}, {transacting})
  },

  taggedPostCount (communityId, tagId) {
    return bookshelf.knex('posts_tags')
    .join('communities_posts', 'communities_posts.post_id', 'posts_tags.post_id')
    .where({community_id: communityId, tag_id: tagId})
    .count()
    .then(rows => Number(rows[0].count))
  },

  defaults (communityId, trx) {
    return CommunityTag.where({community_id: communityId, is_default: true})
    .fetchAll({withRelated: 'tag', transacting: trx})
  }

})
