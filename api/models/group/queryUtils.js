export function isFollowing (q) {
  q.whereRaw("(group_memberships.settings->>'following')::boolean = true")
}
