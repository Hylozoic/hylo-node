module.exports = bookshelf.Model.extend({
  tableName: 'communities_posts',

  post: function () {
    return this.belongsTo(Post)
  },

  community: function () {
    return this.belongsTo(Community)
  },

  pinned: function () {
    return !!this.get('pinned_at')
  },

  togglePinned: function () {
    if (this.pinned()) {
      return this.save({pinned_at: null})
    } else {
      return this.save({pinned_at: new Date()})
    }
  }
}, {
  find: function (postId, communityIdOrSlug, options) {
    const fetch = cid =>
      PostMembership.where({post_id: postId, community_id: cid}).fetch(options)

    if (isNaN(Number(communityIdOrSlug))) {
      return Community.find(communityIdOrSlug)
      .then(c => c && fetch(c.id, options))
    }

    return fetch(communityIdOrSlug)
  }
})
