import searchQuerySet, { fetchSearchQuerySet } from './searchQuerySet'
import {
  makeFilterToggle,
  myCommunityIds,
  sharedMembership,
  sharedPostMembership
} from './filters'

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
        'tagline'
      ],
      relations: [
        'communities',
        'memberships',
        'posts',
        {messageThreads: {typename: 'MessageThread'}},
        {inAppNotifications: {querySet: true, alias: 'notifications'}}
      ],
      getters: {
        hasDevice: u => u.hasDevice()
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
        votesTotal: p => p.get('num_votes'),
        type: p => p.getType(),
        myVote: p => p.userVote(userId).then(v => !!v)
      },
      relations: [
        {comments: {querySet: true}},
        'communities',
        {user: {alias: 'creator'}},
        'followers',
        'linkPreview'
      ],
      filter: nonAdminFilter(sharedPostMembership('posts', userId)),
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
        'postCount'
      ],
      relations: [
        {moderators: {querySet: true}},
        {tagFollows: {querySet: true, alias: 'topicSubscriptions'}}
      ],
      getters: {
        popularSkills: (c, { first }) => c.popularSkills(first),
        feedItems: (c, args) => c.feedItems(args),
        members: (c, { search, first, offset = 0, sortBy }) =>
          fetchSearchQuerySet('forUsers', {
            term: search,
            communities: [c.id],
            limit: first,
            offset,
            sort: sortBy || 'name'
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
          }),

        communityTopics: (c, { first, offset = 0, name, autocomplete }) =>
          fetchSearchQuerySet('forCommunityTopics', {
            limit: first,
            offset,
            name,
            autocomplete,
            communityId: c.id
          })
      },
      filter: nonAdminFilter(q => {
        q.where('communities.id', 'in', myCommunityIds(userId))
      })
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
      filter: nonAdminFilter(q => {
        // this should technically just be equal to Post.isVisibleToUser
        q.where(function () {
          sharedPostMembership('comments', userId, this)
          .orWhere('comments.post_id', 'in',
            Follow.query().select('post_id').where('user_id', userId))
        })
      }),
      isDefaultTypeForTable: true
    },

    LinkPreview: {
      model: LinkPreview,
      attributes: [
        'id',
        'title',
        'url',
        'image_url'
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
      filter: nonAdminFilter(q => {
        q.where('posts.id', 'in',
          Follow.query().select('post_id')
          .where('user_id', userId))
      })
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

    TopicSubscription: {
      model: TagFollow,
      attributes: ['id', 'new_post_count'],
      relations: [
        {tag: {alias: 'topic'}},
        'community'
      ],
      filter: relation => relation.query(q => {
        q.where('tag_follows.user_id', userId)
      })
    },

    CommunityTopic: {
      model: CommunityTag,
      attributes: ['id'],
      getters: {
        postsTotal: ct => CommunityTag.taggedPostCount(ct.get('community_id'), ct.get('tag_id')),
        followersTotal: ct => Tag.followersCount(ct.get('tag_id'), ct.get('community_id'))
      },
      relations: [
        'community',
        {tag: {alias: 'topic'}}
      ]
    },

    Topic: {
      model: Tag,
      attributes: ['id', 'name'],
      getters: {
        postsTotal: t => Tag.taggedPostCount(t.id),
        followersTotal: t => Tag.followersCount(t.id)
      },
      relations: [
        {communityTags: {alias: 'communityTopics', querySet: true}},
        {follows: {alias: 'topicSubscriptions', querySet: true}}
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
      }
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
      fetchMany: ({ first, offset = 0 }) =>
        searchQuerySet('forUserConnections', {limit: first, offset}),
      filter: nonAdminFilter(sharedMembership('users', userId))
    }
  }
}
