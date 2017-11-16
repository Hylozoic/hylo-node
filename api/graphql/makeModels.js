import searchQuerySet from './searchQuerySet'
import {
  commentFilter,
  communityTopicFilter,
  makeFilterToggle,
  sharedCommunityMembership,
  sharedNetworkMembership,
  activePost
} from './filters'
import { myCommunityIds } from '../models/util/queryFilters'
import { flow, mapKeys, camelCase } from 'lodash/fp'
import InvitationService from '../services/InvitationService'
import {
  filterAndSortCommunities,
  filterAndSortPosts,
  filterAndSortUsers
} from '../services/Search/util'

// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys in the returned object are GraphQL schema type names
//
export default function makeModels (userId, isAdmin) {
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
        'unseenThreadCount'
      ],
      relations: [
        'communities',
        'memberships',
        'posts',
        {skills: {querySet: true}},
        {messageThreads: {typename: 'MessageThread', querySet: true}}
      ],
      getters: {
        hasDevice: u => u.hasDevice(),
        settings: u => mapKeys(camelCase, u.get('settings'))
      }
    },

    Membership: {
      model: Membership,
      attributes: [
        'created_at',
        'hasModeratorRole'
      ],
      getters: {
        settings: m => mapKeys(camelCase, m.get('settings')),
        lastViewedAt: m =>
          m.get('user_id') === userId ? m.get('last_viewed_at') : null,
        newPostCount: m =>
          m.get('user_id') === userId ? m.get('new_post_count') : null
      },
      relations: ['community'],
      filter: nonAdminFilter(sharedCommunityMembership('communities_users', userId))
    },

    Person: {
      model: User,
      attributes: [
        'id',
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
      filter: nonAdminFilter(sharedCommunityMembership('users', userId)),
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
        'id',
        'created_at',
        'updated_at',
        'fulfilled_at',
        'starts_at',
        'ends_at',
        'location'
      ],
      getters: {
        title: p => p.get('name'),
        details: p => p.get('description'),
        public: p => (p.get('visibility') === Post.Visibility.PUBLIC_READABLE) || null,
        commenters: (p, { first }) => p.getCommenters(first, userId),
        commentersTotal: p => p.getCommentersTotal(),
        commentsTotal: p => p.get('num_comments'),
        votesTotal: p => p.get('num_votes'),
        type: p => p.getType(),
        myVote: p => p.userVote(userId).then(v => !!v)
      },
      relations: [
        {comments: {querySet: true}},
        'communities',
        {user: {alias: 'creator'}},
        'followers',
        'linkPreview',
        'postMemberships',
        {media: {
          alias: 'attachments',
          arguments: ({ type }) => [type]
        }}
      ],
      filter: flow(
        activePost,
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
        'id',
        'name',
        'slug',
        'description',
        'created_at',
        'avatar_url',
        'banner_url',
        'num_members',
        'postCount',
        'location'
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
        popularSkills: (c, { first }) => c.popularSkills(first),
        feedItems: (c, args) => c.feedItems(args),
        pendingInvitations: (c, { first }) => InvitationService.find({communityId: c.id, pendingOnly: true}),
        invitePath: c =>
          Membership.hasModeratorRole(userId, c.id)
          .then(isModerator => {
            if (!isModerator) return null
            return Frontend.Route.invitePath(c)
          })
      },
      filter: nonAdminFilter(sharedNetworkMembership('communities', userId))
    },

    Comment: {
      model: Comment,
      attributes: [
        'id',
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
        'id',
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
      attributes: ['id', 'created_at', 'updated_at'],
      getters: {
        unreadCount: t => t.unreadCountForUser(userId),
        lastReadAt: t => t.lastReadAtForUser(userId)
      },
      relations: [
        {followers: {alias: 'participants'}},
        {comments: {alias: 'messages', typename: 'Message', querySet: true}}
      ],
      filter: nonAdminFilter(relation => relation.query(q => {
        q.where('posts.id', 'in',
          Follow.query().select('post_id')
          .where('user_id', userId))
      }))
    },

    Message: {
      model: Comment,
      attributes: ['id', 'created_at'],
      relations: [
        {post: {alias: 'messageThread'}},
        {user: {alias: 'creator'}}
      ]
    },

    Vote: {
      model: Vote,
      attributes: ['id'],
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
      attributes: ['id', 'updated_at', 'created_at'],
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
      attributes: ['id', 'name'],
      fetchMany: ({ autocomplete, first = 1000, offset = 0 }) =>
        searchQuerySet('skills', {
          autocomplete, first, offset, currentUserId: userId
        })
    },

    Topic: {
      model: Tag,
      attributes: ['id', 'name'],
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
      attributes: ['id'],
      relations: ['activity'],
      getters: {
        createdAt: n => n.get('created_at')
      },
      fetchMany: ({ first, order, offset = 0 }) =>
        Notification.where({
          'medium': Notification.MEDIUM.InApp,
          'user_id': userId
        })
        .orderBy('id', order)
    },

    Activity: {
      model: Activity,
      attributes: ['id', 'meta', 'unread'],
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
        'id',
        'type',
        'created_at',
        'updated_at'
      ],
      relations: [ {otherUser: {alias: 'person'}} ],
      fetchMany: () => UserConnection,
      filter: relation => relation.query(q => q.where('user_id', userId))
    },

    Network: {
      model: Network,
      attributes: [
        'id',
        'name',
        'slug',
        'description',
        'created_at',
        'avatar_url',
        'banner_url',
        'memberCount'
      ],
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
        'id',
        'type',
        'url',
        'thumbnail_url',
        'position',
        'created_at'
      ]
    },

    PostMembership: {
      model: PostMembership,
      attributes: [
        'id'
      ],
      relations: [
        'community'
      ],
      getters: {
        pinned: pm => pm.pinned()
      }
    }
  }
}
