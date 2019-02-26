import { includes } from 'lodash'
import HasGroup from './mixins/HasGroup'

var knex = bookshelf.knex

var networkIdsQuery = function (userId) {
  const communityIdsQuery = Group.pluckIdsForMember(userId, Community)

  return knex.select().distinct('network_id').from('communities')
    .whereIn('id', communityIdsQuery).whereRaw('network_id is not null')
}

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'networks',

  communities: function () {
    return this.hasMany(Community).query({where: {'communities.active': true}})
  },

  moderators: function () {
    return this.belongsToMany(User, 'networks_users', 'network_id', 'user_id')
    .query({where: {role: GroupMembership.Role.MODERATOR}})
  },

  members: function () {
    return User.collection().query(q => {
      q.distinct()
      q.join('group_memberships', 'users.id', 'group_memberships.user_id')
      q.join('groups', 'group_memberships.group_id', 'groups.id')
      q.join('communities', 'groups.group_data_id', 'communities.id')
      q.where({
        'group_memberships.active': true,
        'groups.group_data_type': Group.DataType.COMMUNITY,
        'communities.network_id': this.id
      })
    })
  },

  async memberCount () {
    const communityIds = await Community.where({
      network_id: this.id,
      active: true
    })
    .query().pluck('id')

    return GroupMembership.forIds(null, communityIds, Community).query()
    .select(bookshelf.knex.raw('count(distinct user_id) as total'))
    .then(rows => Number(rows[0].total))
  },

  posts: function () {
    return this.belongsToMany(Post).through(PostNetworkMembership)
    .query({where: {'posts.active': true}})
  }
}, HasGroup), {

  find: function (idOrSlug, options) {
    if (isNaN(Number(idOrSlug))) {
      return this.where({slug: idOrSlug}).fetch(options)
    }
    return this.where({id: idOrSlug}).fetch(options)
  },

  containsUser: function (networkId, userId) {
    if (!networkId || !userId) return Promise.resolve(false)
    return this.idsForUser(userId)
    .then(ids => includes(ids, networkId.toString()))
  },

  activeCommunityIds: function (userId, rawQuery) {
    var query = knex.select('id').from('communities')
    .where(inner =>
      inner.whereIn('network_id', networkIdsQuery(userId))
      .andWhere('communities.hidden', false))

    return rawQuery ? query : query.pluck('id')
  },

  idsForUser: function (userId) {
    return networkIdsQuery(userId).pluck('network_id')
  }

})
