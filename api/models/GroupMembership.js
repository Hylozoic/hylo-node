import HasSettings from './mixins/HasSettings'
import { isEmpty } from 'lodash'
import { isFollowing } from './group/queryUtils'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_memberships',

  group () {
    return this.belongsTo(Group)
  },

  user () {
    return this.belongsTo(User)
  },

  async updateAndSave (attrs, { transacting } = {}) {
    for (let key in attrs) {
      if (key === 'settings') {
        this.addSetting(attrs[key])
      } else {
        this.set(key, attrs[key])
      }
    }

    if (!isEmpty(this.changed)) await this.save(null, {transacting})
    return this
  }

}, HasSettings), {
  create (groupId, userId, { role, settings }) {
    // TODO
  },

  update (groupId, userId, { role, settings }) {
    // TODO
  },

  queryUnread (userId, { afterTime } = {}) {
    return this.query(q => {
      q.join('groups', 'groups.id', 'group_memberships.group_id')
      if (afterTime) q.where('groups.updated_at', '>', afterTime)
      q.where('group_memberships.user_id', userId)
      isFollowing(q)

      q.where(q2 => {
        q2.whereRaw("(group_memberships.settings->>'lastReadAt') is null")
        .orWhereRaw(`(group_memberships.settings->>'lastReadAt')
          ::timestamp without time zone at time zone 'utc'
          < groups.updated_at`)
      })
    })
  },

  forPair (userOrId, instance) {
    const userId = userOrId instanceof User ? userOrId.id : userOrId
    return this.query(q => {
      q.join('groups', 'groups.id', 'group_memberships.group_id')
      q.where({
        group_data_type: Group.getDataTypeForInstance(instance),
        group_data_id: instance.id,
        'group_memberships.user_id': userId
      })
    })
  }
})
