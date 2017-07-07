import searchQuerySet, { fetchSearchQuerySet } from './searchQuerySet'
import {
  communityTopicFilter,
  makeFilterToggle,
  myCommunityIds,
  sharedMembership,
  sharedPostMembership,
  sharedPostMembershipClause,
  activePost
} from './filters'
import { flow, mapKeys, camelCase } from 'lodash/fp'

// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys in the returned object are GraphQL schema type names
//
export default function makeModels (userId, isAdmin) {
  const nonAdminFilter = makeFilterToggle(!isAdmin)

  return {
    Me: { // the root of the graph
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
        {messageThreads: {typename: 'MessageThread'}}
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
        'hasModeratorRole',
        'role',
        'last_viewed_at',
        'new_post_count'
      ],
      getters: {
        settings: u => mapKeys(camelCase, u.get('settings'))
      },
      relations: ['community'],
      filter: nonAdminFilter(sharedMembership('communities_users', userId))
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
        'comments',
        'memberships',
        {posts: {querySet: true}},
        'votes'
      ],
      filter: nonAdminFilter(sharedMembership('users', userId)),
      isDefaultTypeForTable: true,
      fetchMany: ({ first, order, sortBy, offset, search, autocomplete, filter }) =>
        searchQuerySet('forUsers', {
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
        {communities: {
          filter: nonAdminFilter(relation => relation.query(q => {
            q.where('communities.id', 'in', myCommunityIds(userId))
          }))}},
        {user: {alias: 'creator'}},
        'followers',
        'linkPreview'
      ],
      filter: flow(
        activePost,
        nonAdminFilter(sharedPostMembership('posts', userId))),
      isDefaultTypeForTable: true,
      fetchMany: ({ first, order, sortBy, offset, search, filter, topic }) =>
        searchQuerySet('forPosts', {
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
        'memberCount',
        'postCount',
        'location'
      ],
      relations: [
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
        }}
      ],
      getters: {
        popularSkills: (c, { first }) => c.popularSkills(first),
        feedItems: (c, args) => c.feedItems(args),
        members: (c, { search, first, offset = 0, sortBy, autocomplete }) =>
          fetchSearchQuerySet('forUsers', {
            term: search,
            communities: [c.id],
            limit: first,
            offset,
            sort: sortBy || 'name',
            autocomplete
          }),

        posts: (c, { search, first, offset = 0, sortBy, filter, topic }) =>
          fetchSearchQuerySet('forPosts', {
            term: search,
            communities: [c.id],
            limit: first,
            offset,
            type: filter,
            sort: sortBy,
            topic
          })
      }
    },

    Comment: {
      model: Comment,
      attributes: [
        'id',
        'created_at'
      ],
      relations: [
        'post',
        {user: {alias: 'creator'}}
      ],
      filter: nonAdminFilter(relation => relation.query(q => {
        // this should technically just be equal to Post.isVisibleToUser
        q.where(function () {
          sharedPostMembershipClause('comments', userId, this)
          .orWhere('comments.post_id', 'in',
            Follow.query().select('post_id').where('user_id', userId))
        })
      })),
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
      filter: nonAdminFilter(sharedPostMembership('votes', userId))
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
        searchQuerySet('forTags', {limit: first, offset, name, autocomplete})
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
        'banner_url'
      ],
      relations: [
        {moderators: {querySet: true}},
        {communities: {querySet: true}}
      ]
    }
  }
}
