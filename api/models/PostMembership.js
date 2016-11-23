module.exports = bookshelf.Model.extend({
  tableName: 'communities_posts',

  post: function () {
    return this.belongsTo(Post)
  },

  community: function () {
    return this.belongsTo(Community)
  }

}, {

  find: function (post_id, community_id_or_slug, options) {
    var fetch = community_id =>
      PostMembership.where({post_id, community_id}).fetch(options)

    if (isNaN(Number(community_id_or_slug))) {
      return Community.find(community_id_or_slug)
      .then(function (community) {
        if (community) return fetch(community.id, options)
      })
    }

    return fetch(community_id_or_slug)
  }

})
