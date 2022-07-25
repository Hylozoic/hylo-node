module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'custom_view_topics',
  // requireFetch: true,
  // customView () {
  //   return this.belongsTo(CustomView)
  // },
  // topic () {
  //   return this.belongsTo(Tag)
  // }
}), {
  find (groupId, opts = {}) {
    if (!groupId) return Promise.resolve(null)

    const where = { group_id: groupId }

    return this.where(where).fetch(opts)
  },
  topics: async function () {
    const searchId = this.id
    const query = `select t.* from saved_search_topics sst
    left join tags as t on sst.tag_id = t.id
    where sst.saved_search_id = ${searchId}`
    const result = await bookshelf.knex.raw(query)
    return result.rows || []
  },
  create: function (params) {
    const { tag_id, custom_view_id, transacting } = params

    const attributes = {
      tag_id,
      custom_view_id,
      created_at: new Date()
    }

    return this.forge(attributes).save({}, { transacting })
  },
  delete: function (params) {
    const { tagId, customViewId } = params

    const query = `DELETE FROM custom_view_topics where custom_view_id = ${customViewId} ANDI = ${tagId}`
    return bookshelf.knex.raw(query)
  }
})
