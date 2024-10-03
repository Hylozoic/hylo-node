export const commentFilter = userId => relation => relation.query(q => {
  q.distinct()
  q.where({ 'comments.active': true })

  if (userId) {
    q.leftJoin('groups_posts', 'comments.post_id', 'groups_posts.post_id')
    q.join('posts', 'groups_posts.post_id', 'posts.id')
    q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))

    q.where(q2 => {
      const followedPostIds = PostUser.followedPostIds(userId)
      q2.whereIn('comments.post_id', followedPostIds)
        .orWhereIn('groups_posts.group_id', Group.selectIdsForMember(userId))
        .orWhere('posts.is_public', true)
    })
    q.groupBy('comments.id')
  }
})

// Which groups are visible to the user?
export const groupFilter = userId => relation => {
  return relation.query(q => {
    q.where('groups.active', true)

    // non authenticated queries can only see public groups
    if (!userId) {
      q.where('groups.visibility', Group.Visibility.PUBLIC)
      // Only show groups that are allowed to be show in public
      q.andWhere('groups.allow_in_public', true)
    } else {
      // the effect of using `where` like this is to wrap everything within its
      // callback in parentheses -- this is necessary to keep `or` from "leaking"
      // out to the rest of the query
      q.where(q2 => {
        const selectIdsForMember = Group.selectIdsForMember(userId)
        const parentGroupIds = GroupRelationship.parentIdsFor(selectIdsForMember)
        const childGroupIds = GroupRelationship.childIdsFor(selectIdsForMember)
        // You can see all related groups, even hidden ones, if you are a group Administrator
        const selectStewardedGroupIds = Group.selectIdsByResponsibilities(userId, [Responsibility.Common.RESP_ADMINISTRATION])
        const childrenOfStewardedGroupIds = GroupRelationship.childIdsFor(selectStewardedGroupIds)

        // Can see groups you are a member of...
        q2.whereIn('groups.id', selectIdsForMember)
        // + their parent groups
        q2.orWhereIn('groups.id', parentGroupIds)
        // + child groups that are not hidden, except Admininstrators of a group can see its hidden children
        q2.orWhere(q3 => {
          q3.where(q4 => {
            q4.whereIn('groups.id', childGroupIds)
            q4.andWhere('groups.visibility', '!=', Group.Visibility.HIDDEN)
          })
          q3.orWhereIn('groups.id', childrenOfStewardedGroupIds)
        })
        // + all public groups
        q2.orWhere(q5 => {
          q5.where('groups.visibility', Group.Visibility.PUBLIC)
          // Only show groups that are allowed to be show in public
          q5.andWhere('groups.allow_in_public', true)
        })
      })
    }
  })
}

export function groupTopicFilter (userId, {
  autocomplete,
  groupId,
  isDefault,
  subscribed,
  visibility
}) {
  return q => {
    if (groupId) {
      q.where('groups_tags.group_id', groupId)
    }

    if (autocomplete) {
      q.join('tags', 'tags.id', 'groups_tags.tag_id')
      q.whereRaw('tags.name ilike ?', autocomplete + '%')
    }

    if (isDefault) {
      q.where('groups_tags.is_default', true)
    }

    if (subscribed && userId) {
      q.join('tag_follows', 'tag_follows.tag_id', 'groups_tags.tag_id')
      q.where('tag_follows.user_id', userId)
      q.whereRaw('tag_follows.group_id = groups_tags.group_id')
    }

    if (visibility) {
      q.whereIn('groups_tags.visibility', visibility)
    }
  }
}

export function makeFilterToggle (enabled) {
  return filterFn => relation =>
    enabled ? filterFn(relation) : relation
}

export const membershipFilter = userId => relation => {
  if (userId) {
    return relation.query(q => {
      // XXX: why are we passing in AXOLOTL_ID? wouldnt that return all memberships the AXOLOTL has too?
      const subq = GroupMembership.forMember([userId, User.AXOLOTL_ID]).query().select('group_id')
      q.whereIn('group_memberships.group_id', subq)
    })
  }
  return relation
}

export const messageFilter = userId => relation => relation.query(q => {
  q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))
})

export const personFilter = userId => relation => relation.query(q => {
  if (userId) {
    q.whereNotIn('users.id', BlockedUser.blockedFor(userId))

    // limit to users that are in those other memberships or are connected some other way

    // find all other memberships of users that are in shared groups
    const sharedMemberships = GroupMembership.query(q3 => {
      q3.select('group_memberships.user_id')
      q3.whereIn('group_memberships.group_id', Group.selectIdsForMember(userId))
    })
    const sharedConnections = UserConnection.query(ucq => {
      ucq.select('other_user_id')
      ucq.where('user_connections.user_id', userId)
    })
    q.where(inner =>
      inner.where('users.id', User.AXOLOTL_ID)
        .orWhereIn('users.id', sharedMemberships.query())
        .orWhereIn('users.id', sharedConnections.query()))
  }
})

export const postFilter = (userId, isAdmin) => relation => {
  return relation.query(q => {
    // Always only show active posts
    q.where('posts.active', true)

    // If we are loading posts through a group then groups_posts already joined, otherwise we need it
    // Also check if we already loaded groups_posts in the forPosts search code
    if ((!relation.relatedData || relation.relatedData.parentTableName !== 'groups') && !q.queryContext()?.alreadyJoinedGroupPosts) {
      q.join('groups_posts', 'groups_posts.post_id', '=', 'posts.id')
    }

    if (!userId) {
      // non authenticated queries can only see public posts
      q.where('posts.is_public', true)
    } else if (!isAdmin) {
      // Only show posts that are public or posted to a group the user is a member of
      q.where(q3 => {
        const selectIdsForMember = Group.selectIdsForMember(userId)
        q3.whereIn('groups_posts.group_id', selectIdsForMember).orWhere('posts.is_public', true)
      })

      // Don't show posts from blocked users
      q.whereNotIn('posts.user_id', BlockedUser.blockedFor(userId))
    }
  })
}

// Only can see reactions from active posts that are public or are in a group that the person is a member of
export const reactionFilter = userId => relation => {
  return relation.query(q => {
    q.join('groups_posts', 'reactions.entity_id', 'groups_posts.post_id')
    q.join('posts', 'posts.id', 'groups_posts.post_id')
    q.where('posts.active', true)
    q.andWhere('reactions.entity_type', 'post')
    q.andWhere(q2 => {
      const selectIdsForMember = Group.selectIdsForMember(userId)
      q.whereIn('groups_posts.group_id', selectIdsForMember)
      q.orWhere('posts.is_public', true)
    })
  })
}
