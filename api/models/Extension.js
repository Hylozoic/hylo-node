module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'extensions',
  requireFetch: false,
  hasTimestamps: ['created_at', null]
}), {})
