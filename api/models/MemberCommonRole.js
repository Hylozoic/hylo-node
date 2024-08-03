/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'group_memberships_common_roles',
  requireFetch: false,

  group: function () {
    return this.belongsTo(Group, 'group_id')
  },

  user: function () {
    return this.belongsTo(User, 'user_id')
  },

  commonRole: function () {
    return this.belongsTo(CommonRole, 'common_role_id')
  },

  groupMembership () {
    return this.belongsTo(GroupMembership, ['group_id', 'user_id'])
  }
}, {
  // TODO: this should not use the actual role names, not the old role system
  updateCoordinatorRole: async function ({ userId, groupId, role, transacting }) {
    // depending on the value of the role, we need to add or remove the user from the Coordinator common role
    if (role === GroupMembership.Role.MODERATOR) {
      const query = bookshelf.knex.raw(`
        WITH ExistingMembership AS (
          -- CTE to check if a row already exists in group_memberships_common_roles for the specified ids
          SELECT 1
          FROM group_memberships_common_roles
          WHERE user_id = ${userId}
            AND group_id = ${groupId}
            AND common_role_id = 1
          LIMIT 1
        )
        -- Final query to insert a row if it doesn't already exist
        INSERT INTO group_memberships_common_roles (user_id, group_id, common_role_id)
        SELECT ${userId}, ${groupId}, 1
        WHERE NOT EXISTS (SELECT 1 FROM ExistingMembership);`
      )
      return transacting ? query.transacting(transacting) : query
    }

    if (role === GroupMembership.Role.DEFAULT) {
      return MemberCommonRole.where({ group_id: groupId, user_id: userId, common_role_id: 1 }).destroy({ require: false, transacting })
    }
  }
})
