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

}, {

  find: function (id, options) {
    if (!id) return Promise.resolve(null)
    if (isNaN(Number(id))) {
      return Tag.where({name: id}).fetch(options)
    }
    return Tag.where({id: id}).fetch(options)
  },

  updateForPost: function (post, tag, trx) {
    return Promise.resolve()
  }
})
