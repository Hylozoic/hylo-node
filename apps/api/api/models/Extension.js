module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'extensions',
  requireFetch: false,
  hasTimestamps: ['created_at', null]
}), {

  find (idOrType, opts = {}) {
    if (!idOrType) return Promise.resolve(null)

    let where = isNaN(Number(idOrType))
      ? ({type: idOrType})
      : ({id: idOrType})

    return this.where(where).fetch(opts)
  },

})
