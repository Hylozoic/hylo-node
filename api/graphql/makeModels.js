import searchQuerySet from './searchQuerySet'
import {
  commentFilter,
  communityTopicFilter,
  makeFilterToggle,
  membershipFilter,
  personFilter,
  sharedNetworkMembership,
  activePost,
  messageFilter
} from './filters'
import { myCommunityIds } from '../models/util/queryFilters'
import { flow, mapKeys, camelCase } from 'lodash/fp'
import InvitationService from '../services/InvitationService'
import {
  filterAndSortCommunities,
  filterAndSortPosts,
  filterAndSortUsers
} from '../services/Search/util'
import { isFollowing } from '../models/group/queryUtils'

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
        'communities',
        'memberships',
        'posts',
        {skills: {querySet: true}},
        {messageThreads: {typename: 'MessageThread', querySet: true}}
      ],
      getters: {
        blockedUsers: u => u.blockedUsers().fetch(),
        isAdmin: () => isAdmin || false,
        settings: u => mapKeys(camelCase, u.get('settings'))
      }
    },

    Membership: {
      model: GroupMembership,
      attributes: [
        'created_at'
      ],
      getters: {
        settings: m => mapKeys(camelCase, m.get('settings')),
        lastViewedAt: m =>
          m.get('user_id') === userId ? m.getSetting('lastReadAt') : null,
        newPostCount: m =>
          m.get('user_id') === userId ? m.get('new_post_count') : null,
        community: m => m.groupData().fetch(),
        hasModeratorRole: async m => {
          const community = await m.groupData().fetch()
          return GroupMembership.hasModeratorRole(userId, community)
        }
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
        'twitter_name',
        'linkedin_url',
        'facebook_url',
        'url',
        'location',
        'tagline'
      ],
      getters: {
        messageThreadId: p => p.getMessageThreadWith(userId).then(post => post ? post.id : null)
      },
      relations: [
        'memberships',
        {posts: {querySet: true}},
        {comments: {querySet: true}},
        {skills: {querySet: true}},
        {votes: {querySet: true}}
      ],
      filter: nonAdminFilter(personFilter(userId)),
      isDefaultTypeForTable: true,
      fetchMany: ({ first, order, sortBy, offset, search, autocomplete, filter }) =>
        searchQuerySet('users', {
          term: search,
          limit: first,
          offset,
          type: filter,
          autocomplete,
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
        'announcement'
      ],
      getters: {
        title: p => p.get('name'),
        details: p => p.get('description'),
        detailsText: p => p.getDetailsText(),
        public: p => (p.get('visibility') === Post.Visibility.PUBLIC_READABLE) || null,
        commenters: (p, { first }) => p.getCommenters(first, userId),
        commentersTotal: p => p.getCommentersTotal(userId),
        commentsTotal: p => p.get('num_comments'),
        votesTotal: p => p.get('num_votes'),
        type: p => p.getType(),
        myVote: p => p.userVote(userId).then(v => !!v),
        myEventResponse: p => 
          p.userEventInvitation(userId)
          .then(eventInvitation => eventInvitation ? eventInvitation.get('response') : '')
      },
      relations: [
        {comments: {querySet: true}},
        'communities',
        {user: {alias: 'creator'}},
        'followers',
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
      filter: flow(
        activePost(userId),
        nonAdminFilter(sharedNetworkMembership('posts', userId))),
      isDefaultTypeForTable: true,
      fetchMany: ({ first, order, sortBy, offset, search, filter, topic }) =>
        searchQuerySet('posts', {
          term: search,
          limit: first,
          offset,
          type: filter,
          sort: sortBy,
          topic
        })
    },

    Community: {
      model: Community,
      attributes: [
        'name',
        'slug',
        'description',
        'created_at',
        'avatar_url',
        'banner_url',
        'num_members',
        'postCount',
        'location',
        'hidden',
        'allow_community_invites'
      ],
      relations: [
        'network',
        {moderators: {querySet: true}},
        {communityTags: {
          querySet: true,
          alias: 'communityTopics',
          filter: (relation, { autocomplete, subscribed }) =>
            relation.query(communityTopicFilter(userId, {
              autocomplete,
              subscribed,
              communityId: relation.relatedData.parentId
            }))
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
        {users: {
          alias: 'members',
          querySet: true,
          filter: (relation, { autocomplete, search, sortBy }) =>
            relation.query(filterAndSortUsers({ autocomplete, search, sortBy }))
        }},
        {posts: {
          querySet: true,
          filter: (relation, { search, sortBy, topic, filter }) =>
            relation.query(filterAndSortPosts({
              search,
              sortBy,
              topic,
              type: filter,
              showPinnedFirst: true
            }))
        }}
      ],
      getters: {
        feedItems: (c, args) => c.feedItems(args),
        pendingInvitations: (c, { first }) => InvitationService.find({communityId: c.id, pendingOnly: true}),
        invitePath: c =>
          GroupMembership.hasModeratorRole(userId, c)
          .then(isModerator => isModerator ? Frontend.Route.invitePath(c) : null)
      },
      filter: nonAdminFilter(sharedNetworkMembership('communities', userId)),
      fetchMany: ({ first, order, sortBy, offset, search, autocomplete, filter }) =>
        searchQuerySet('communities', {
          term: search,
          limit: first,
          offset,
          type: filter,
          autocomplete,
          sort: sortBy
        })
    },

    Invitation: {
      model: Invitation,
      attributes: [
        'email',
        'created_at',
        'last_sent_at'
      ]
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
        {media: {
          alias: 'attachments',
          arguments: ({ type }) => [type]
        }}
      ],
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
        q.where('posts.id', 'in',
          Group.pluckIdsForMember(userId, Post, isFollowing)))
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
      filter: nonAdminFilter(sharedNetworkMembership('votes', userId))
    },

    CommunityTopic: {
      model: CommunityTag,
      attributes: ['updated_at', 'created_at'],
      getters: {
        postsTotal: ct => ct.postCount(),
        followersTotal: ct => ct.followerCount(),
        isSubscribed: ct => ct.isFollowed(userId),
        newPostCount: ct => ct.newPostCount(userId)
      },
      relations: [
        'community',
        {tag: {alias: 'topic'}}
      ],
      filter: nonAdminFilter(relation => relation.query(q => {
        q.where('communities_tags.community_id', 'in', myCommunityIds(userId))
      })),
      fetchMany: args => CommunityTag.query(communityTopicFilter(userId, args))
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
        postsTotal: t => Tag.taggedPostCount(t.id),
        followersTotal: t => Tag.followersCount(t.id)
      },
      relations: [
        {communityTags: {alias: 'communityTopics', querySet: true}}
      ],
      fetchMany: ({ first, offset = 0, name, autocomplete }) =>
        searchQuerySet('tags', {limit: first, offset, name, autocomplete})
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
      filter: (relation) => relation.query(q => {
        q.join('activities', 'activities.id', 'notifications.activity_id')
        q.join('posts', 'posts.id', 'activities.post_id')
        q.join('comments', 'comments.id', 'activities.comment_id')
        q.where('activities.actor_id', 'NOT IN', BlockedUser.blockedFor(userId))
        q.where('posts.user_id', 'NOT IN', BlockedUser.blockedFor(userId))
        q.where('comments.user_id', 'NOT IN', BlockedUser.blockedFor(userId))
      })
    },

    Activity: {
      model: Activity,
      attributes: ['meta', 'unread'],
      relations: [
        'actor',
        'post',
        'comment',
        'community'
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
          q.where('other_user_id', 'NOT IN', BlockedUser.blockedFor(userId))
          q.where('user_id', userId)
          q.orderBy('created_at', 'desc')
        })
      }
    },

    Network: {
      model: Network,
      attributes: [
        'name',
        'slug',
        'description',
        'created_at',
        'avatar_url',
        'banner_url',
        'memberCount'
      ],
      getters: {
        isModerator: n => NetworkMembership.hasModeratorRole(userId, n.id),
        isAdmin: n => NetworkMembership.hasAdminRole(userId, n.id)
      },
      relations: [
        {moderators: {querySet: true}},
        {members: {
          querySet: true,
          filter: (relation, { autocomplete, search, sortBy }) =>
            relation.query(filterAndSortUsers({ autocomplete, search, sortBy }))
        }},
        {posts: {
          querySet: true,
          filter: (relation, { search, sortBy, topic, filter }) =>
            relation.query(filterAndSortPosts({ search, sortBy, topic, type: filter }))
        }},
        {communities: {
          querySet: true,
          filter: (relation, { search, sortBy }) =>
            relation.query(filterAndSortCommunities({ search, sortBy }))
        }}
      ]
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
        'community'
      ]
    }
  }
}
