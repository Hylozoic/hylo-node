module.exports = bookshelf.Model.extend({
  tableName: 'user_affiliations',
  requireFetch: false,
  hasTimestamps: true,

  user: function () {
    return this.belongsTo(User)
  }
}, {

  create: async function (opts) {
    const { userId, role, preposition, orgName, url } = opts
    const affiliation = await this.forge({
      user_id: userId,
      created_at: new Date(),
      role,
      preposition,
      org_name: orgName,
      url
    }).save()

    return affiliation
  },

  find: function (id) {
    if (!id) return Promise.resolve(null)
    return Affiliation.where({id}).fetch()
  },

  delete: async function (id) {
    const attributes = { updated_at: new Date(), is_active: false }
    await Affiliation.query().where({ id }).update(attributes)
    return id
  }

})
