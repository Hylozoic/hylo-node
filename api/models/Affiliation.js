module.exports = bookshelf.Model.extend({
  tableName: 'user_affiliations',
  requireFetch: false,

  user: function () {
    return this.belongsTo(User)
  }
}, {

  create: function (opts) {
    const { userId, role, preposition, orgName, url } = opts
    return new Affiliation({
      user_id: userId,
      created_at: new Date(),
      role,
      preposition,
      org_name: orgName,
      url
    }).save()
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
