import knexPostgis from 'knex-postgis';

module.exports = bookshelf.Model.extend({
  tableName: 'saved_search_topics',
  hasTimestamps: true
}, {
  create: function (params) {
    const { tag_id, saved_search_id } = params

    const attributes = {
      tag_id,
      saved_search_id,
      created_at: new Date(),
    }

    return this.forge(attributes).save()
  }
})
