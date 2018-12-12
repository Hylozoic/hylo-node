module.exports = bookshelf.Model.extend({
  tableName: 'project_contributions',

  user: function () {
    return this.belongsTo(User)
  },

  project: function () {
    return this.belongsTo(Post)
  },
}, {

  // find: function (nameOrId, opts = {}) {
  //   if (!nameOrId) return Promise.resolve(null)

  //   if (isNaN(Number(nameOrId))) {
  //     return this.query(qb => qb.whereRaw('lower(name) = lower(?)', nameOrId))
  //     .fetch(opts)
  //   }
  //   return this.where({id: nameOrId}).fetch(opts)
  // },


})
