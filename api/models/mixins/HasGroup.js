import { getDataTypeForModel, getDataTypeForInstance } from '../group/DataType'

export default {
  async createGroup ({ transacting } = {}) {
    return await Group.forge({
      group_data_id: this.id,
      group_data_type: getDataTypeForInstance(this),
      created_at: new Date()
    }).save(null, {transacting})
  },

  async group (opts) {
    console.log("getting group", opts)
    if (this._group) {
      console.log("already have group", this._group)
      await this._group.refresh()
      return this._group
    }
    this._group = await Group.find(this, opts)
    if (!this._group) {
      this._group = await this.createGroup(opts)
    }
    return this._group
  },

  async addGroupMembers (...args) {
    const dbOpts = args[2]
    return this.group(dbOpts).then(group => group.addMembers(...args))
  },

  async removeGroupMembers (...args) {
    const dbOpts = args[1]
    return this.group(dbOpts).then(group => group.removeMembers(...args))
  },

  async updateGroupMembers (...args) {
    const dbOpts = args[2]
    return this.group(dbOpts).then(group => group.updateMembers(...args))
  },

  queryByGroupRelationship (model, direction = 'parent') {
    // TODO we can infer the correct direction in most cases rather than
    // requiring it to be specified
    const dataType = getDataTypeForModel(model)
    const [ fromCol, toCol ] = direction === 'parent'
      ? ['child_group_id', 'parent_group_id']
      : ['parent_group_id', 'child_group_id']

    const subq = Group.query()
    .join('group_connections as gc', 'groups.id', `gc.${fromCol}`)
    .join('groups as g2', 'g2.id', `gc.${toCol}`)
    .where({
      'groups.group_data_id': this.id,
      'groups.group_data_type': getDataTypeForInstance(this),
      'g2.group_data_type': dataType,
      'gc.active': true
    })
    .select('g2.group_data_id')

    return model.whereIn('id', subq)
  },

  groupMembers (where) {
    let subq = GroupMembership.query()
    .join('groups', 'groups.id', 'group_memberships.group_id')
    .where({
      group_data_id: this.id,
      'groups.group_data_type': getDataTypeForInstance(this),
      'group_memberships.active': true
    })
    .select('user_id')
    if (where) subq = subq.where(where)

    return User.collection().query(q => {
      q.whereIn('id', subq)
      q.where('users.active', true)
    })
  },

  groupMembersWithPivots () {
    // This method uses Bookshelf's `withPivot` to return instances with
    // join table columns attached.
    //
    // To do so, we need to get the Bookshelf model instance for the group, so
    // we need to get the group asynchronously. But we don't want this method
    // to be asynchronous, because we want to still be able to do e.g.
    //
    //   await post.followers().fetch()
    //
    // not
    //
    //   const followers = await post.followers()
    //   await followers.fetch()
    //
    // so we use a little ES6 Proxy that pretends to be a Bookshelf collection
    // instance (at least by accepting `.query` calls), and then when `fetch` or
    // `fetchOne` is called, gets the group, then applies any stored `query`
    // calls and the final `fetch` to the real relation.
    //
    // A good reference for proxies:
    // https://ponyfoo.com/articles/es6-proxies-in-depth

    const queryCalls = []
    const addQueryCall = cb => queryCalls.push(cb) && proxy
    const tableName = User.forge().tableName
    const tableNameFn = () => tableName
    const proxy = new Proxy(this, {
      get (target, key) {
        if (key === 'query') return addQueryCall
        if (key === 'tableName') return tableNameFn

        // handle other keys here if it becomes necessary to fake any other
        // Bookshelf collection properties

        if (typeof key === 'string' && key.startsWith('fetch')) {
          return async (...args) => {
            const group = await target.group()
            let relation = group.members().withPivot(['created_at', 'role', 'settings'])
            for (let cb of queryCalls) relation = relation.query(cb)
            return relation[key](...args)
          }
        }
      }
    })

    return proxy
  },

  async isFollowed (userId) {
    const ms = await GroupMembership.forPair(userId, this).fetch()
    return !!(ms && ms.getSetting('following'))
  }

  // proxy some instance methods of Group?
}
