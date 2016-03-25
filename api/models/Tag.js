module.exports = bookshelf.Model.extend({

  tableName: 'tags',

  owner: function () {
    return this.belongsTo(User, 'owner_id')
  },

  users: function () {
    return this.belongsToMany(User).through(TagUser)
  },

  communities: function () {
    return this.belongsToMany(Community).through(CommunityTag)
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostTag)
  }
})
