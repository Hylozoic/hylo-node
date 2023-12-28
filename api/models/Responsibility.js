const RESP_ADMINISTRATION = 'Administration'
const RESP_ADD_MEMBERS = 'Add Members'
const RESP_REMOVE_MEMBERS = 'Remove Members'
const RESP_MANAGE_CONTENT = 'Manage Content'

module.exports = bookshelf.Model.extend({
  tableName: 'responsibilities',
  requireFetch: false,
  hasTimestamps: true,

  group: function () {
    return this.belongsTo(Group, 'group_id')
  },

  // responsiblities have a many-to-many relationship with group_roles
  groupRoles: function () {
    return this.belongsToMany(GroupRole, 'group_roles_responsibilities', 'responsibility_id', 'group_role_id')
  }
}, {
  constants: {
    RESP_ADD_MEMBERS,
    RESP_ADMINISTRATION,
    RESP_MANAGE_CONTENT,
    RESP_REMOVE_MEMBERS
  },
  fetchAll: function ({ groupId = 0, groupRoleId, commonRoleId }) {
    if (groupRoleId) {
      return bookshelf.knex('responsibilities')
        .join('group_roles_responsibilities', 'responsibilities.id', 'group_roles_responsibilities.responsibility_id')
        .where('group_roles_responsibilities.group_role_id', groupRoleId)
    }
    if (commonRoleId) {
      return bookshelf.knex('responsibilities')
        .join('common_roles_responsibilities', 'responsibilities.id', 'common_roles_responsibilities.responsibility_id')
        .where('common_roles_responsibilities.common_role_id', commonRoleId)
    }
    return bookshelf.knex('responsibilities').whereRaw('group_id is NULL or group_id = ?', groupId)
  },
  fetchForUserAndGroupAsStrings (userId, groupId) {
    return bookshelf.knex.raw(
      `WITH UserGroupRoles AS (
        -- CTE to get group_role_id for the specified user and group
        SELECT group_role_id
        FROM members_roles
        WHERE user_id = ${userId}
          AND group_id = ${groupId}
      ),
      CommonRolesGroupMemberships AS (
        -- CTE to get common_role_id for the specified user and group from common_roles_group_memberships
        SELECT common_role_id
        FROM common_roles_group_memberships
        WHERE user_id = ${userId}
          AND group_id = ${groupId}
      ),
      ResponsibilitiesCTE AS (
        -- CTE to get responsibility_id for the group_role_id values from UserGroupRoles
        SELECT responsibility_id
        FROM group_roles_responsibilities
        WHERE group_role_id IN (SELECT group_role_id FROM UserGroupRoles)
        UNION
        -- UNION with responsibility_id for the common_role_id values from CommonRolesGroupMemberships
        SELECT responsibility_id
        FROM common_roles_responsibilities
        WHERE common_role_id IN (SELECT common_role_id FROM CommonRolesGroupMemberships)
      )
      -- Final query to get all records from the responsibilities table with matching responsibility_id
      SELECT title
      FROM responsibilities
      WHERE id IN (SELECT responsibility_id FROM ResponsibilitiesCTE);`
    ).then(resp => resp.rows.map(r => r.title))
  }
})
