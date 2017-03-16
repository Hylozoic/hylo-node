// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys here are table names (except for "me")
export default function models (userId, isAdmin) {
  // TODO: cache this?
  const myCommunityIds = () =>
    Membership.query().select('community_id')
    .where({user_id: userId, active: true})

  const nonAdminFilter = queryFn => relation =>
    isAdmin ? relation : relation.query(queryFn)

  return {
    me: { // the root of the graph
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
      model: Membership,
      attributes: ['created_at', 'role', 'last_viewed_at'],
      relations: ['community']
    },

    users: {
      model: User,
      attributes: ['id', 'name', 'avatar_url'],
      relations: ['posts'],
      filter: nonAdminFilter(q => {
        q.where('users.id', 'in', Membership.query().select('user_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    posts: {
      model: Post,
      attributes: [
        'id',
        'created_at',
        'type',
        'public',
        'fulfilled_at',
        'starts_at',
        'ends_at',
        'location'
      ],
      getters: {
        title: p => p.get('name'),
        details: p => p.get('description'),
        public: p => (p.get('visibility') === Post.Visibility.PUBLIC_READABLE) || null
      },
      relations: ['communities', 'followers'],
      filter: nonAdminFilter(q => {
        q.where('posts.id', 'in', PostMembership.query().select('post_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    communities: {
      model: Community,
      attributes: ['id', 'name', 'slug', 'created_at'],
      getters: {
        popularSkills: (c, { first }) => c.popularSkills(first),
        memberCount: (c) => c.memberCount(),
        postCount: (c) => c.postCount()
      },
      relations: [{members: 'users'}],
      filter: nonAdminFilter(q => {
        q.where('communities.id', 'in', myCommunityIds())
      })
    }
  }
}
