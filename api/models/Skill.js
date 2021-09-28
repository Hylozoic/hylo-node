module.exports = bookshelf.Model.extend({
  tableName: 'skills',
  requireFetch: false,

  groupsSuggesting: function () {
    return this.belongsToMany(Group, 'groups_suggested_skills')
  },

  users: function () {
    return this.belongsToMany(User, 'skills_users').query({ where: { type: Skill.Type.HAS } })
  },

  usersLearning: function () {
    return this.belongsToMany(User, 'skills_users').query({ where: { type: Skill.Type.LEARNING } })
  }

}, {

  Type: {
    HAS: 0,
    LEARNING: 1
  },

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
      q.join('group_memberships', 'group_memberships.user_id', 'skills_users.user_id')
      q.whereIn('group_memberships.group_id', Group.selectIdsForMember(currentUserId))
    })
  }
})
