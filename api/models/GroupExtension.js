module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_extensions',
  requireFetch: false,
  hasTimestamps: ['created_at', null],
  group () {
    return this.belongsTo(Group)
  },
  extension () {
    return this.belongsTo(Extension)
  },
  async type () {
    return (await this.extension().fetch()).get('type')
  }
}), {
  find (groupId, extensionId, opts = {}) {
    if (!groupId || !extensionId) return Promise.resolve(null)

    const where = { group_id: groupId, extension_id: extensionId }

    return this.where(where).fetch(opts)
  }
})
