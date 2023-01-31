import { isEmpty, isEqual, difference } from 'lodash'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'zapier_triggers',
  requireFetch: false,
  hasTimestamps: true,

  user () {
    return this.belongsTo(User)
  },

  group () {
    return this.belongsTo(Group)
  }

}), {

  find (id, opts = {}) {
    if (!id) return Promise.resolve(null)
    const where = { id }
    return this.where(where).fetch(opts)
  }

})
