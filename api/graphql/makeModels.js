import { PAGINATION_TOTAL_COLUMN_NAME } from '../../lib/graphql-bookshelf-bridge/util/applyPagination'

// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys in the returned object are GraphQL schema type names
//
export default function makeModels (userId, isAdmin) {
  // TODO: cache this?
  const myCommunityIds = () =>
    Membership.query().select('community_id')
    .where({user_id: userId, active: true})

  const nonAdminFilter = queryFn => relation =>
    isAdmin ? relation : relation.query(queryFn)

  return {
    Me: { // the root of the graph
      model: User,
      attributes: [
        'id',
        'name',
        'email',
        'avatar_url',
        'banner_url',
        'url',
        'bio',
        'updated_at'
      ],
      relations: [
        'communities',
        'memberships',
        'posts',
        {messageThreads: {typename: 'MessageThread'}}
      ],
      getters: {
        hasDevice: u => u.hasDevice()
      }
    },

    Membership: {
      model: Membership,
      attributes: ['created_at', 'hasModeratorRole', 'role', 'last_viewed_at'],
      relations: ['community'],
      filter: nonAdminFilter(q => {
        q.where('communities_users.community_id', 'in', myCommunityIds())
      })
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
        'location'
      ],
      relations: [
        'comments',
        'memberships',
        'posts',
        'votes'
      ],
      filter: nonAdminFilter(q => {
        q.where('users.id', 'in', Membership.query().select('user_id')
          .where('community_id', 'in', myCommunityIds()))
      }),
      isDefaultTypeForTable: true
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
        commenters: (p, { first }) => p.getCommenters(first),
        commentersTotal: p => p.getCommentersTotal(),
        votesTotal: p => p.get('num_votes'),
        type: p => p.getType()
      },
      relations: [
        {comments: {querySet: true}},
        'communities',
        {user: {alias: 'creator'}},
        'followers',
        'linkPreview'
      ],
      filter: nonAdminFilter(q => {
        q.where('posts.id', 'in', PostMembership.query().select('post_id')
          .where('community_id', 'in', myCommunityIds()))
      }),
      isDefaultTypeForTable: true
    },

    Community: {
      model: Community,
      attributes: [
        'id',
        'name',
        'slug',
        'created_at',
        'avatar_url',
        'banner_url',
        'memberCount',
        'postCount'
      ],
      getters: {
        popularSkills: (c, { first }) => c.popularSkills(first),
        feedItems: (c, args) => c.feedItems(args),
        members: (c, { search, first, offset = 0, sortBy }) =>
          Search.forUsers({
            term: search,
            communities: [c.id],
            limit: first,
            offset,
            sort: sortBy
          }).fetchAll().then(({ length, models }) => {
            const items = models
            const total = models.length > 0
              ? Number(models[0].get('total'))
              : 0
            return {
              total,
              items,
              hasMore: offset + first < total
            }
          })
      },
      relations: [
        'posts'
      ],
      filter: nonAdminFilter(q => {
        q.where('communities.id', 'in', myCommunityIds())
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
          this.where('comments.post_id', 'in',
            PostMembership.query().select('post_id')
            .where('community_id', 'in', myCommunityIds()))
          .orWhere('comments.post_id', 'in',
            Follow.query().select('post_id')
            .where('user_id', userId))
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
        {comments: {alias: 'messages', typename: 'Message'}}
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
      relations: [{user: {alias: 'creator'}}]
    },

    Vote: {
      model: Vote,
      attributes: [ 'id' ],
      getters: {
        createdAt: v => v.get('date_voted')
      },
      relations: [
        'post',
        { user: { alias: 'voter' } }
      ],
      filter: nonAdminFilter(q => {
        q.where('votes.post_id', 'in', PostMembership.query().select('post_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    }
  }
}
