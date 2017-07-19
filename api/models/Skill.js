module.exports = bookshelf.Model.extend({
  tableName: 'skills',

  users: function () {
    return this.belongsToMany(User, 'skills_users')
  }

}, {

  find: function (nameOrId, opts = {}) {
    if (!nameOrId) return Promise.resolve(null)

    const where = isNaN(Number(nameOrId))
      ? {name: nameOrId}
      : {id: nameOrId}

    return this.where(where).fetch(opts)
  }
})
