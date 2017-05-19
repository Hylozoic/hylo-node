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
    .join('posts', 'posts.id', 'posts_tags.post_id')
    .join('communities_posts', 'communities_posts.post_id', 'posts_tags.post_id')
    .where('posts.active', true)
    .where({community_id: communityId, tag_id: tagId})
    .count()
    .then(rows => Number(rows[0].count))
  },

  defaults (communityId, trx) {
    return CommunityTag.where({community_id: communityId, is_default: true})
    .fetchAll({withRelated: 'tag', transacting: trx})
  },

  findIdByTagAndCommunity (topicName, communitySlug) {
    return CommunityTag.query(q => {
      q.join('communities', 'communities.id', 'communities_tags.community_id')
      q.where('communities.slug', communitySlug)
      q.join('tags', 'tags.id', 'communities_tags.tag_id')
      q.where('tags.name', topicName)
      q.select('communities_tags.id')
    }).fetch().then(model => model ? model.id : null)
  }

})
