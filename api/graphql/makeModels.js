// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys here are table names (except for "me")
export default function makeModels (userId, isAdmin) {
  // TODO: cache this?
  const myCommunityIds = () =>
    Membership.query().select('community_id')
    .where({user_id: userId, active: true})

  const nonAdminFilter = queryFn => relation =>
    isAdmin ? relation : relation.query(queryFn)

  return {
    me: { // the root of the graph
      typename: 'Me',
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
      relations: ['communities', 'posts', 'memberships'],
      getters: {
        hasDevice: u => u.hasDevice()
      }
    },

    communities_users: {
      typename: 'Membership',
      model: Membership,
      attributes: ['created_at', 'role', 'last_viewed_at'],
      relations: ['community', {person: 'user'}]
    },

    users: {
      typename: 'Person',
      model: User,
      attributes: ['id', 'name', 'avatar_url'],
      relations: ['posts'],
      filter: nonAdminFilter(q => {
        q.where('users.id', 'in', Membership.query().select('user_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    posts: {
      typename: 'Post',
      model: Post,
      attributes: [
        'id',
        'created_at',
        'updated_at',
        'type',
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
        votesTotal: p => p.get('num_votes')
      },
      relations: ['comments', 'communities', { creator: 'user' }, 'followers', 'linkPreview'],
      filter: nonAdminFilter(q => {
        q.where('posts.id', 'in', PostMembership.query().select('post_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    communities: {
      typename: 'Community',
      model: Community,
      attributes: ['id', 'name', 'slug', 'created_at', 'avatar_url'],
      getters: {
        popularSkills: (c, { first }) => c.popularSkills(first),
        memberCount: (c) => c.memberCount(),
        postCount: (c) => c.postCount(),
        feedItems: (c, args) => c.feedItems(args)
      },
      relations: [{members: 'users'}],
      filter: nonAdminFilter(q => {
        q.where('communities.id', 'in', myCommunityIds())
      })
    },

    comments: {
      typename: 'Comment',
      model: Comment,
      attributes: [
        'id',
        'created_at'
      ],
      getters: {
        text: c => c.get('text')
      },
      relations: [{ creator: 'user' }],
      filter: nonAdminFilter(q => {
        q.where('comments.post_id', 'in', PostMembership.query().select('post_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    link_previews: {
      typename: 'LinkPreview',
      model: LinkPreview,
      attributes: [
        'id',
        'title',
        'url',
        'image_url'
      ],
      getters: {
        title: c => c.get('title'),
        url: c => c.get('url'),
        imageUrl: c => c.get('image_url')
      }
      // TODO: filter for linkPreviews
      // filter: nonAdminFilter(q => {
      //   q.where('comments.post_id', 'in', PostMembership.query().select('post_id')
      //     .where('community_id', 'in', myCommunityIds()))
      // })
    }
  }
}
