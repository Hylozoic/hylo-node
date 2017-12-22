export function myCommunityIdsSqlFragment (userId) {
  return `(select "group_data_id" from "groups"
    inner join "group_memberships"
    on "groups"."id" = "group_memberships"."group_id"
    where "groups"."group_data_type" = ${Group.DataType.COMMUNITY}
    and "group_memberships"."active" = true
    and "groups"."active" = true
    and "group_memberships"."user_id" = '${userId}')`
}

export function myNetworkCommunityIdsSqlFragment (userId) {
  return `(select "id" from "communities"
    where "network_id" in (
      select distinct "network_id" from "communities"
      where "id" in ${myCommunityIdsSqlFragment(userId)}
      and network_id is not null
    ))`
}
