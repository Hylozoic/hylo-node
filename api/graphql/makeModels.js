import searchQuerySet from './searchQuerySet'
import {
  commentFilter,
  groupFilter,
  groupTopicFilter,
  makeFilterToggle,
  membershipFilter,
  messageFilter,
  personFilter,
  postFilter,
  voteFilter
} from './filters'
import { mapKeys, camelCase } from 'lodash/fp'
import InvitationService from '../services/InvitationService'
import {
  filterAndSortPosts,
  filterAndSortUsers
} from '../services/Search/util'

// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys in the returned object are GraphQL schema type names
//
export default async function makeModels (userId, isAdmin) {
  const nonAdminFilter = makeFilterToggle(!isAdmin)

  return {
    Me: {
      model: User,
      attributes: [
        'id',
        'name',
        'email',
        'avatar_url',
        'banner_url',
        'contact_email',
        'contact_phone',
        'twitter_name',
        'linkedin_url',
        'facebook_url',
        'url',
        'location',
        'bio',
        'updated_at',
        'tagline',
        'new_notification_count',
        'intercomHash'
      ],
      relations: [
        'groups',
        'memberships',
        'posts',
        'locationObject',
        {affiliations: {querySet: true}},
        {groupInvitesPending: {querySet: true}},
        {joinRequests: {
          querySet: true,
          filter: (relation, { status }) =>
            relation.query(q => {
              if (typeof status !== 'undefined') {
                q.where('status', status)
              }
            })
        }},
        {skills: {querySet: true}},
        {skillsToLearn: {querySet: true}},
        {messageThreads: {typename: 'MessageThread', querySet: true}}
      ],
      getters: {
        blockedUsers: u => u.blockedUsers().fetch(),
        isAdmin: () => isAdmin || false,
        settings: u => mapKeys(camelCase, u.get('settings')),
        hasStripeAccount: u => u.hasStripeAccount()
      }
    },

    Membership: {
      model: GroupMembership,
      attributes: [
        'created_at'
      ],
      relations: [
        { group: { alias: 'group' } },
        { user: { alias: 'person' } }
      ],
      getters: {
        settings: m => mapKeys(camelCase, m.get('settings')),
        lastViewedAt: m =>
          m.get('user_id') === userId ? m.getSetting('lastReadAt') : null,
        newPostCount: m =>
          m.get('user_id') === userId ? m.get('new_post_count') : null,
        hasModeratorRole: m => m.hasRole(GroupMembership.Role.MODERATOR)
      },
      filter: nonAdminFilter(membershipFilter(userId))
    },

    Person: {
      model: User,
      attributes: [
        'name',
        'avatar_url',
        'banner_url',
        'bio',
        'contact_email',
        'contact_phone',
        'twitter_name',
        'linkedin_url',
        'facebook_url',
        'url',
        'last_active_at',
        'location',
        'tagline'
      ],
      getters: {
        messageThreadId: p => p.getMessageThreadWith(userId).then(post => post ? post.id : null)
      },
      relations: [
        'memberships',
        'moderatedGroupMemberships',
        'locationObject',
        {affiliations: {querySet: true}},
        {eventsAttending: {querySet: true}},
        {posts: {querySet: true}},
        {projects: {querySet: true}},
        {comments: {querySet: true}},
        {skills: {querySet: true}},
        {skillsToLearn: {querySet: true}},
        {votes: {querySet: true}}
      ],
      filter: nonAdminFilter(personFilter(userId)),
      isDefaultTypeForTable: true,
      fetchMany: ({ boundingBox, first, order, sortBy, offset, search, autocomplete, groupIds, filter }) =>
        searchQuerySet('users', {
          boundingBox,
          term: search,
          limit: first,
          offset,
          order,
          type: filter,
          autocomplete,
          groups: groupIds,
          sort: sortBy
        })
    },

    Post: {
      model: Post,
      attributes: [
        'created_at',
        'updated_at',
        'fulfilled_at',
        'end_time',
        'start_time',
        'location',
        'announcement',
        'accept_contributions',
        'is_public',
        'type'
      ],
      getters: {
        commenters: (p, { first }) => p.getCommenters(first, userId),
        commentersTotal: p => p.getCommentersTotal(userId),
        myVote: p => userId ? p.userVote(userId).then(v => !!v) : false,
        myEventResponse: p =>
          userId && p.isEvent() ? p.userEventInvitation(userId)
          .then(eventInvitation => eventInvitation ? eventInvitation.get('response') : '')
          : ''
      },
      relations: [
        {comments: {querySet: true}},
        'groups',
        {user: {alias: 'creator'}},
        'followers',
        'locationObject',
        {members: {querySet: true}},
        {eventInvitations: {querySet: true}},
        'linkPreview',
        'postMemberships',
        {media: {
          alias: 'attachments',
          arguments: ({ type }) => [type]
        }},
        {tags: {alias: 'topics'}}
      ],
      filter: postFilter(userId, isAdmin),
      isDefaultTypeForTable: true,
      fetchMany: ({ afterTime, beforeTime, boundingBox, context, filter, first, groupSlugs, isFulfilled, offset, order, sortBy, search, topic, topics, types }) =>
        searchQuerySet('posts', {
          afterTime,
          beforeTime,
          boundingBox,
          currentUserId: userId,
          groupSlugs,
          isFulfilled,
          limit: first,
          offset,
          onlyMyGroups: context === 'all',
          onlyPublic: context === 'public',
          order,
          sort: sortBy,
          term: search,
          topic,
          topics,
          type: filter,
          types
        })
    },

    Group: {
      model: Group,
      attributes: [
        'accessibility',
        'avatar_url',
        'banner_url',
        'created_at',
        'description',
        'geo_shape',
        'location',
        'memberCount',
        'name',
        'postCount',
        'slug',
        'visibility',
        'type'
      ],
      relations: [
        {activeMembers: { querySet: true }},
        {childGroups: {querySet: true}},
        {groupRelationshipInvitesFrom: {querySet: true}},
        {groupRelationshipInvitesTo: {querySet: true}},
        {groupTags: {
          querySet: true,
          alias: 'groupTopics',
          filter: (relation, { autocomplete, subscribed }) =>
            relation.query(groupTopicFilter(userId, {
              autocomplete,
              subscribed,
              groupId: relation.relatedData.parentId
            }))
        }},
        {groupToGroupJoinQuestions: {querySet: true}},
        {joinQuestions: {querySet: true}},
        'locationObject',
        {moderators: {querySet: true}},
        {members: {
          querySet: true,
          filter: (relation, { autocomplete, boundingBox, order, search, sortBy }) =>
            relation.query(filterAndSortUsers({ autocomplete, boundingBox, order, search, sortBy }))
        }},
        {parentGroups: {querySet: true}},
        {posts: {
          querySet: true,
          filter: (relation, { afterTime, beforeTime, boundingBox, filter, isAnnouncement, isFulfilled, order, search, sortBy, topic, topics, types }) =>
            relation.query(filterAndSortPosts({
              afterTime,
              beforeTime,
              boundingBox,
              isAnnouncement,
              isFulfilled,
              order,
              search,
              showPinnedFirst: true,
              sortBy,
              topic,
              topics,
              type: filter,
              types
            }))
        }},
        {prerequisiteGroups: {
          querySet: true,
          filter: (relation, { onlyNotMember }) =>
            relation.query(q => {
              if (onlyNotMember) {
                // Only return prerequisite groups that the current user is not yet a member of
                q.whereNotIn('groups.id', GroupMembership.query().select('group_id').where({
                  'group_memberships.user_id': userId,
                  'group_memberships.active': true
                }))
              }
            })
        }},
        {skills: {
          querySet: true,
          filter: (relation, { autocomplete }) =>
            relation.query(q => {
              if (autocomplete) {
                q.whereRaw('skills.name ilike ?', autocomplete + '%')
              }
            })
        }},
        {suggestedSkills: {querySet: true}},
        {viewPosts: {
          querySet: true,
          arguments: () => [userId],
          filter: (relation, { afterTime, beforeTime, boundingBox, filter, isFulfilled, order, search, sortBy, topic, topics, types }) =>
            relation.query(filterAndSortPosts({
              afterTime,
              beforeTime,
              boundingBox,
              isFulfilled,
              order,
              search,
              showPinnedFirst: true,
              sortBy,
              topic,
              topics,
              type: filter,
              types
            }))
        }},
        {widgets: {querySet: true }},
        {groupExtensions: {querySet: true }}
      ],
      getters: {
        invitePath: g =>
          GroupMembership.hasModeratorRole(userId, g)
          .then(isModerator => isModerator ? Frontend.Route.invitePath(g) : null),
        // Get number of prerequisite groups that current user is not a member of yet
        numPrerequisitesLeft: g => g.numPrerequisitesLeft(userId),
        pendingInvitations: (g, { first }) => InvitationService.find({groupId: g.id, pendingOnly: true}),
        settings: g => mapKeys(camelCase, g.get('settings'))
      },
      filter: nonAdminFilter(groupFilter(userId)),
      fetchMany: ({ autocomplete, boundingBox, context, farmQuery, filter, first, groupIds, groupType, nearCoord, offset, onlyMine, order, parentSlugs, search, sortBy, visibility }) =>
        searchQuerySet('groups', {
          autocomplete,
          boundingBox,
          currentUserId: userId,
          farmQuery,
          groupIds,
          groupType,
          limit: first,
          nearCoord,
          offset,
          onlyMine: context === 'all',
          order,
          parentSlugs,
          sort: sortBy,
          term: search,
          type: filter,
          visibility: context === 'public' ? Group.Visibility.PUBLIC : visibility
        })
    },

    GroupJoinQuestion: {
      model: GroupJoinQuestion,
      attributes: [
        'questionId',
        'text'
      ]
    },

    GroupToGroupJoinQuestion: {
      model: GroupToGroupJoinQuestion,
      attributes: [
        'questionId',
        'text'
      ]
    },

    GroupRelationship: {
      model: GroupRelationship,
      attributes: [
        'created_at',
        'role',
        'updated_at',
      ],
      relations: ['childGroup', 'parentGroup']
    },

    GroupRelationshipInvite: {
      model: GroupRelationshipInvite,
      attributes: [
        'created_at',
        'status',
        'type',
        'updated_at',
      ],
      getters: {
        questionAnswers: i => i.questionAnswers().fetch()
      },
      relations: ['createdBy', 'fromGroup', 'toGroup']
    },

    Invitation: {
      model: Invitation,
      attributes: [
        'id',
        'created_at',
        'email',
        'last_sent_at',
        'token'
      ],
      relations: [
        'creator',
        'group'
      ],
    },

    JoinRequest: {
      model: JoinRequest,
      attributes: [
        'created_at',
        'updated_at',
        'status'
      ],
      relations: [
        'group',
        'user'
      ],
      getters: {
        questionAnswers: jr => jr.questionAnswers().fetch()
      },
      fetchMany: ({ groupId }) => JoinRequest.where({ 'group_id': groupId, status: JoinRequest.STATUS.Pending })
    },

    JoinRequestQuestionAnswer: {
      model: JoinRequestQuestionAnswer,
      attributes: [
        'answer'
      ],
      relations: ['question'],
    },

    Question: {
      model: Question,
      attributes: [
        'text'
      ]
    },

    Affiliation: {
      model: Affiliation,
      attributes: [
        'created_at',
        'updated_at',
        'role',
        'preposition',
        'org_name',
        'url',
        'is_active',
      ],
      relations: ['user']
    },

    EventInvitation: {
      model: EventInvitation,
      attributes: [
        'response'
      ],
      relations: [
        {user: {alias: 'person'}}
      ]
    },

    Comment: {
      model: Comment,
      attributes: [
        'created_at'
      ],
      relations: [
        'post',
        {user: {alias: 'creator'}},
        {childComments: { querySet: true }},
        {media: {
          alias: 'attachments',
          arguments: ({ type }) => [type]
        }}
      ],
      getters: {
        parentComment: (c) => c.parentComment().fetch()
      },
      filter: nonAdminFilter(commentFilter(userId)),
      isDefaultTypeForTable: true
    },

    LinkPreview: {
      model: LinkPreview,
      attributes: [
        'title',
        'url',
        'image_url',
        'image_width',
        'image_height',
        'status'
      ]
    },

    Location: {
      model: Location,
      attributes: [
        'accuracy',
        'address_number',
        'address_street',
        'bbox',
        'center',
        'city',
        'country',
        'full_text',
        'locality',
        'neighborhood',
        'region',
        'postcode'
      ]
    },

    MessageThread: {
      model: Post,
      attributes: ['created_at', 'updated_at'],
      getters: {
        unreadCount: t => t.unreadCountForUser(userId),
        lastReadAt: t => t.lastReadAtForUser(userId)
      },
      relations: [
        {followers: {alias: 'participants'}},
        {comments: {alias: 'messages', typename: 'Message', querySet: true}}
      ],
      filter: relation => relation.query(q =>
        q.whereIn('posts.id', PostUser.followedPostIds(userId)))
    },

    Message: {
      model: Comment,
      attributes: ['created_at'],
      relations: [
        {post: {alias: 'messageThread', typename: 'MessageThread'}},
        {user: {alias: 'creator'}}
      ],
      filter: messageFilter(userId)
    },

    Vote: {
      model: Vote,
      getters: {
        createdAt: v => v.get('date_voted')
      },
      relations: [
        'post',
        {user: {alias: 'voter'}}
      ],
      filter: nonAdminFilter(voteFilter('votes', userId))
    },

    GroupTopic: {
      model: GroupTag,
      attributes: ['is_default', 'visibility', 'updated_at', 'created_at'],
      getters: {
        postsTotal: ct => ct.postCount(),
        followersTotal: ct => ct.followerCount(),
        isSubscribed: ct => ct.isFollowed(userId),
        newPostCount: ct => ct.newPostCount(userId)
      },
      relations: [
        'group',
        { tag: { alias: 'topic'}}
      ],
      filter: nonAdminFilter(relation => relation.query(q => {
        q.whereIn('groups_tags.group_id', Group.selectIdsForMember(userId))
      })),
      fetchMany: args => GroupTag.query(groupTopicFilter(userId, args))
    },

    SavedSearch: {
      model: SavedSearch,
      attributes: [
        'boundingBox',
        'group',
        'context',
        'created_at',
        'name',
        'is_active',
        'search_text',
        'post_types'
      ],
      fetchMany: ({ userId }) => SavedSearch.where({ 'user_id': userId, 'is_active': true })
    },

    Skill: {
      model: Skill,
      attributes: ['name'],
      fetchMany: ({ autocomplete, first = 1000, offset = 0 }) =>
        searchQuerySet('skills', {
          autocomplete, first, offset, currentUserId: userId
        })
    },

    Topic: {
      model: Tag,
      attributes: ['name'],
      getters: {
        postsTotal: (t, opts = {}) =>
          Tag.taggedPostCount(t.id, Object.assign({}, opts, { userId })),
        followersTotal: (t, opts = {}) =>
          Tag.followersCount(t.id, Object.assign({}, opts, { userId }))
      },
      relations: [{
        groupTags: {
          alias: 'groupTopics',
          querySet: true,
          filter: (relation, { autocomplete, subscribed, isDefault, visibility }) =>
            relation.query(groupTopicFilter(userId, {
              autocomplete,
              isDefault,
              subscribed,
              visibility
            })
          )
        }
      }],
      fetchMany: ({ groupSlug, name, isDefault, visibility, autocomplete, first, offset = 0, sortBy }) =>
        searchQuerySet('tags', { userId, groupSlug, name, autocomplete, isDefault, visibility, limit: first, offset, sort: sortBy })
    },

    Notification: {
      model: Notification,
      relations: ['activity'],
      getters: {
        createdAt: n => n.get('created_at')
      },
      fetchMany: ({ first, order, offset = 0 }) =>
        Notification.where({
          'medium': Notification.MEDIUM.InApp,
          'notifications.user_id': userId
        })
        .orderBy('id', order),
      // TODO: fix this filter. Currently it filters out any notification without a comment
      // filter: (relation) => relation.query(q => {
      //   q.join('activities', 'activities.id', 'notifications.activity_id')
      //   q.join('posts', 'posts.id', 'activities.post_id')
      //   q.join('comments', 'comments.id', 'activities.comment_id')
      //   q.whereNotIn('activities.actor_id', BlockedUser.blockedFor(userId))
      //   q.whereNotIn('posts.user_id', BlockedUser.blockedFor(userId))
      //   q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))
      // })
    },

    Activity: {
      model: Activity,
      attributes: ['meta', 'unread'],
      relations: [
        'actor',
        'post',
        'comment',
        'group',
        'otherGroup'
      ],
      getters: {
        action: a => Notification.priorityReason(a.get('meta').reasons)
      }
    },

    PersonConnection: {
      model: UserConnection,
      attributes: [
        'type',
        'created_at',
        'updated_at'
      ],
      relations: [ {otherUser: {alias: 'person'}} ],
      fetchMany: () => UserConnection,
      filter: relation => {
        return relation.query(q => {
          if (userId) {
            q.whereNotIn('other_user_id', BlockedUser.blockedFor(userId))
            q.where('user_id', userId)
          }
          q.orderBy('created_at', 'desc')
        })
      }
    },

    Attachment: {
      model: Media,
      attributes: [
        'type',
        'url',
        'thumbnail_url',
        'position',
        'created_at'
      ]
    },

    PostMembership: {
      model: PostMembership,
      relations: [
        'group'
      ]
    },

    PostUser: {
      model: PostUser,
      relations: [
        'post',
        'user'
      ]
    },

    GroupExtension: {
      model: GroupExtension,
      attributes:[
        'id',
        'active',
        'type',
      ],
      getters:{
        data: groupExtension => groupExtension.pivot && groupExtension.pivot.get('data'),
      }
    },

    Extension: {
      model: Extension,
      attributes: [
        'id',
        'type'
      ]
    },

    GroupWidget: {
      model: GroupWidget,
      attributes: [
        'id',
        'is_visible',
        'name',
        'order',
        'context'
      ],
      getters: {
        settings: gw => mapKeys(camelCase, gw.get('settings'))
      },
      relations: ['group']
    },

    Widget: {
      model: Widget,
      attributes: [
        'id',
        'name'
      ]
    }
  }
}
