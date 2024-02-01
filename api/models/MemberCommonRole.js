/* eslint-disable camelcase */

module.exports = bookshelf.Model.extend({
  tableName: 'common_roles_group_memberships',
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
    return this.belongsTo(GroupMembership, 'group_membership_id')
  },

  updateManagerRole: async function ({ groupMembershipId, userId, groupId, role, transacting }) {
    // dependening on the value of the role, we need to add or remove the user from the manager common role

    if (role === GroupMembership.Role.MODERATOR) {
      return bookshelf.knex.raw(`WITH ManagerRole AS (
        -- CTE to get the id of the 'Manager' role from common_roles table
        SELECT id
        FROM common_roles
        WHERE name = 'Manager'
      ),
      ExistingMembership AS (
        -- CTE to check if a row already exists in common_roles_group_memberships for the specified ids
        SELECT 1
        FROM common_roles_group_memberships
        WHERE user_id = ${userId}
          AND group_id = ${groupId}
          AND group_membership_id = ${groupMembershipId}
          AND common_role_id = (SELECT id FROM ManagerRole)
        LIMIT 1
      )
      -- Final query to insert a row if it doesn't already exist
      INSERT INTO common_roles_group_memberships (user_id, group_id, group_membership_id, common_role_id)
      SELECT ${userId}, ${groupId}, ${groupMembershipId}, id
      FROM ManagerRole
      WHERE NOT EXISTS (SELECT 1 FROM ExistingMembership);`,
      { transacting }
      )
    }

    if (role === GroupMembership.Role.DEFAULT) {
      // remove the user from the manager common role

      return bookshelf.knex.raw(
        `WITH ManagerRole AS (
          -- CTE to get the id of the 'Manager' role from common_roles table
          SELECT id
          FROM common_roles
          WHERE name = 'Manager'
        )
        -- Delete the row if it exists
        DELETE FROM common_roles_group_memberships
        WHERE user_id = ${userId}
          AND group_id = ${groupId}
          AND group_membership_id = ${groupMembershipId}
          AND common_role_id = (SELECT id FROM ManagerRole);`
        , { transacting })
    }
  }
}, {
})
