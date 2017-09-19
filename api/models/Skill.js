import { myCommunityIds, myNetworkCommunityIds } from './util/queryFilters'

module.exports = bookshelf.Model.extend({
  tableName: 'skills',

  users: function () {
    return this.belongsToMany(User, 'skills_users')
  }

}, {

  find: function (nameOrId, opts = {}) {
    if (!nameOrId) return Promise.resolve(null)

    if (isNaN(Number(nameOrId))) {
      return this.query(qb => qb.whereRaw('lower(name) = lower(?)', nameOrId))
      .fetch(opts)
    }
    return this.where({id: nameOrId}).fetch(opts)
  },

  search: function ({ autocomplete, limit, offset, currentUserId }) {
    return this.query(q => {
      q.limit(limit)
      q.offset(offset)
      q.orderByRaw('upper("name") asc')

      if (autocomplete) {
        q.whereRaw('name ilike ?', autocomplete + '%')
      }
      q.join('skills_users', 'skills_users.skill_id', 'skills.id')
      q.join('communities_users', 'communities_users.user_id', 'skills_users.user_id')
      q.where(function () {
        this.whereIn('communities_users.community_id', myCommunityIds(currentUserId))
        .orWhereIn('communities_users.community_id', myNetworkCommunityIds(currentUserId))
      })
    })
  }
})
