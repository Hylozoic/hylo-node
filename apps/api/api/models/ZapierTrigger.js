import { castArray } from 'lodash'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'zapier_triggers',
  requireFetch: false,
  hasTimestamps: true,

  user () {
    return this.belongsTo(User)
  },

  groups () {
    return this.belongsToMany(Group).through(ZapierTriggerGroup)
  }

}), {

  find (id, opts = {}) {
    if (!id) return Promise.resolve(null)
    const where = { id }
    return this.where(where).fetch(opts)
  },

  forTypeAndGroups (type, groupIdOrArray) {
    const groupIds = castArray(groupIdOrArray)
    return ZapierTrigger.query(q => {
      q.join('zapier_triggers_groups', 'zapier_trigger_id', 'zapier_triggers.id')
      q.where({ type }).whereIn('group_id', groupIds)
    })
  }

})
