module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'custom_view_topics',
  requireFetch: false,

  customView: function () {
    return this.belongsTo(Post)
  },

  tag: function () {
    return this.belongsTo(Tag)
  }
}), {
  create: function (attributes, transacting = false) {
    const options = {}
    if (transacting) {
      options['transacting'] = transacting
    }
    return this.forge(attributes).save({}, options)
  }
})
