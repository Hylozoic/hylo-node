module.exports = bookshelf.Model.extend({
  tableName: 'groups_posts',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post)
  },

  group: function () {
    return this.belongsTo(Group)
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
  find: function (postId, groupIdOrSlug, options) {
    const fetch = gid =>
      PostMembership.where({post_id: postId, group_id: gid}).fetch(options)

    if (isNaN(Number(groupIdOrSlug))) {
      return Group.find(groupIdOrSlug)
      .then(g => g && fetch(g.id, options))
    }

    return fetch(groupIdOrSlug)
  }
})
