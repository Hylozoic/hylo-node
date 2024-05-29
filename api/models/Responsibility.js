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

  // Users with these responsibilities we show to users in the sidebar of the group
  IMPORTANT_RESPONSIBILITIES: [RESP_ADMINISTRATION, RESP_REMOVE_MEMBERS, RESP_MANAGE_CONTENT],

  Common: {
    RESP_ADMINISTRATION: 1,
    RESP_ADD_MEMBERS: 2,
    RESP_REMOVE_MEMBERS: 3,
    RESP_MANAGE_CONTENT: 4
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
        FROM group_memberships_group_roles
        WHERE user_id = ${userId}
          AND group_id = ${groupId}
      ),
      CommonRolesGroupMemberships AS (
        -- CTE to get common_role_id for the specified user and group from group_memberships_common_roles
        SELECT common_role_id
        FROM group_memberships_common_roles
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
  },

  fetchSystemResponsiblititesForUser (userId, groupIds = []) {
    return bookshelf.knex.raw(
      `WITH UserGroupRoles AS (
        -- CTE to get group_role_id and group_id for the specified user
        SELECT
          m.group_role_id,
          m.group_id
        FROM group_memberships_group_roles m
        WHERE m.user_id = ${userId}
      ),
      CommonRolesGroupMemberships AS (
        -- CTE to get common_role_id and group_id for the specified user
        SELECT
          c.common_role_id,
          c.group_id
        FROM group_memberships_common_roles c
        WHERE c.user_id = ${userId}
      ),
      ResponsibilitiesCTE AS (
        -- CTE to get responsibility_id, group_id, and source table for the user's roles with type 'system'
        SELECT
          gr.responsibility_id,
          ugr.group_id,
          r.title
        FROM group_roles_responsibilities gr
        JOIN UserGroupRoles ugr ON gr.group_role_id = ugr.group_role_id
        JOIN responsibilities r ON gr.responsibility_id = r.id AND r.type = 'system'
        UNION
        -- UNION with responsibility_id, group_id, and source table for the user's common roles with type 'system'
        SELECT
          cr.responsibility_id,
          cm.group_id,
          r.title
        FROM common_roles_responsibilities cr
        JOIN CommonRolesGroupMemberships cm ON cr.common_role_id = cm.common_role_id
        JOIN responsibilities r ON cr.responsibility_id = r.id AND r.type = 'system'
      )
      -- Final query to get responsibility_id, group_id pairs sorted by group_id
      SELECT
        r.responsibility_id,
        r.group_id,
        r.title
      FROM ResponsibilitiesCTE r
      ORDER BY r.group_id;`
    ).then(resp => {
      if (groupIds.length === 0) return resp.rows
      return resp.rows.filter(r => groupIds.includes(r.group_id))
    })
  },

  fetchForGroup (groupId) {
    return bookshelf.knex.raw(
      `SELECT DISTINCT
        r.title AS responsibility_title,
        m.user_id
      FROM responsibilities r
      JOIN group_roles_responsibilities gr ON r.id = gr.responsibility_id
      JOIN group_memberships_group_roles m ON gr.group_role_id = m.group_id
      WHERE r.type = 'system' AND m.group_id = ${groupId}

      UNION

      SELECT DISTINCT
        r.title AS responsibility_title,
        c.user_id
      FROM responsibilities r
      JOIN common_roles_responsibilities cr ON r.id = cr.responsibility_id
      JOIN group_memberships_common_roles c ON cr.common_role_id = c.common_role_id
      WHERE r.type = 'system' AND c.group_id = ${groupId};`
    ).then(resp => resp.rows)
  },

  hasAllResponsibilities (rows) {
    const userCounts = rows.reduce((acc, row) => {
      const { user_id } = row
      acc[user_id] = (acc[user_id] || 0) + 1
      return acc
    }, {})

    return Object.entries(userCounts)
      .filter(([_, count]) => count >= 4)
      .map(([user_id]) => parseInt(user_id, 10))
  }
})
