module.exports = bookshelf.Model.extend({
  tableName: 'skills',

  users: function () {
    return this.belongsToMany(User, 'skills_users')
  }

}, {

  find: function (nameOrId, opts = {}) {
    if (!nameOrId) return Promise.resolve(null)

    if (isNaN(Number(nameOrId))) {
      return Skill.query(qb => qb.whereRaw('lower(name) = lower(?)', nameOrId))
      .fetch(opts)
    }
    return Skill.where({id: nameOrId}).fetch(opts)
  }
})
