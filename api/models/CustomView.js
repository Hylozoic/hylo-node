module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'custom_views',
  requireFetch: false,
  group () {
    return this.belongsTo(Group)
  },
  topics (){
    return this.hasMany(Topics)
  }
}), {
  find (groupId opts = {}) {
    if (!groupId) return Promise.resolve(null)

    const where = { group_id: groupId }

    return this.where(where).fetch(opts)
  }
})
