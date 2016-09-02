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

  taggedPostCount (communityId, tagId) {
    return bookshelf.knex('posts_tags')
    .join('post_community', 'post_community.post_id', 'posts_tags.post_id')
    .where({community_id: communityId, tag_id: tagId})
    .count()
    .then(rows => Number(rows[0].count))
  }

})
