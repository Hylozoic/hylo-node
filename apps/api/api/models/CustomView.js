import { isEmpty, isEqual, difference } from 'lodash'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'custom_views',
  requireFetch: false,
  hasTimestamps: true,

  initialize() {
    this.on('destroying', function(model, options) {
      options.require = false
      if (options.transacting) {
        CustomViewTopic.where({ custom_view_id: this.id }).destroy(options)
      } else {
        bookshelf.knex.transaction(transacting => CustomViewTopic.where({ custom_view_id: this.id }).destroy({ ...options, transacting }))
      }
    })
  },

  collection () {
    return this.belongsTo(Collection)
  },

  group () {
    return this.belongsTo(Group)
  },

  tags () {
    return this.belongsToMany(Tag).through(CustomViewTopic)
  },

  async updateTopics(topics, transacting) {
    const newTopicIds = topics ? await Promise.map(topics, async (t) => parseInt(t.id) || parseInt((await Tag.findOrCreate(t.name, { transacting })).id)) : []
    const existingTopics = (await CustomViewTopic.query(q => q.select('tag_id').where('custom_view_id', this.id)).fetchAll({ transacting }))
    const existingTopicIds = existingTopics.map(t => parseInt(t.get('tag_id')))

    if (!isEqual(newTopicIds, existingTopicIds)) {
      const topicsToAdd = difference(newTopicIds, existingTopicIds)
      const topicsToRemove = difference(existingTopicIds, newTopicIds)

      await Promise.map(topicsToAdd, async (id) => {
        await CustomViewTopic.create({ tag_id: id, custom_view_id: this.id }, transacting)
      })

      await Promise.map(topicsToRemove, async (id) => {
        await CustomViewTopic.where({ tag_id: id, custom_view_id: this.id }).destroy({ require: false, transacting })
      })
    }
  }
}), {
  find (id, opts = {}) {
    if (!id) return Promise.resolve(null)
    const where = { id }
    return this.where(where).fetch(opts)
  }
})
