import { isEqual, difference } from 'lodash'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'custom_views',
  requireFetch: false,
  group () {
    return this.belongsTo(Group)
  },
  // Left in if we want to add topics to custom-views in the future
  // topics () {
  //   return this.hasMany(CustomViewTopic)
  // }
}), {
  find (groupId, opts = {}) {
    if (!groupId) return Promise.resolve(null)

    const where = { group_id: groupId }

    return this.where(where).fetch(opts)
  },
  // Left in if we want to add topics to custom-views in the future
  // async updateTopics (topics, transacting) {
  //   const topicIds = topics.map(topic => topic.id)
  //   const existingTopicIds = await CustomViewTopic.query(q => q.where('custom_view_id', this.id)).fetch({ transacting })
  //   if (!isEqual(topicIds, existingTopicIds)) {
  //     const topicsToAdd = difference(topicIds, existingTopicIds)
  //     const topicsToRemove = difference(existingTopicIds, topicIds)

  //     Promise.Map(topicsToAdd, async (tag_id) => {
  //       await CustomViewTopic.create({ tag_id, custom_view_id: this.id, transacting })
  //     })

  //     Promise.Map(topicsToRemove, async (tag_id) => {
  //       await CustomViewTopic.delete({ tag_id, custom_view_id: this.id })
  //     })
  //   }
  // }
})
