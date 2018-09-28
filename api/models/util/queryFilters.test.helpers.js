export function myCommunityIdsSqlFragment (userId) {
  return `(select "group_data_id" from "group_memberships"
    inner join "groups"
    on "groups"."id" = "group_memberships"."group_id"
    where "group_memberships"."group_data_type" = ${Group.DataType.COMMUNITY}
    and "group_memberships"."user_id" = '${userId}'
    and "group_memberships"."active" = true
    and "groups"."active" = true)`
}

export function myNetworkCommunityIdsSqlFragment (userId, opts = {}) {
  const str = `select "id" from "communities"
    where ("network_id" in (
      select distinct "network_id" from "communities"
      where "id" in ${myCommunityIdsSqlFragment(userId)}
        and network_id is not null)
      and "communities"."hidden" = false
    )`
  return opts.parens === false ? str : `(${str})`
}

export function blockedUserSqlFragment (userId) {
  return `"users"."id" not in (
    SELECT user_id
    FROM blocked_users
    WHERE blocked_user_id = '${userId}'
    UNION
    SELECT blocked_user_id
    FROM blocked_users
    WHERE user_id = '${userId}'
  )`
}