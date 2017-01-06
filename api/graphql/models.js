// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys here are table names (except for "me")
export default function models (userId) {
  // TODO: cache this?
  const myCommunityIds = () =>
    Membership.query().select('community_id')
    .where({user_id: userId, active: true})

  return {
    me: { // the root of the graph
      model: User,
      attributes: ['id', 'name', 'avatar_url'],
      relations: ['communities', 'posts'],
      getters: {
        hasDevice: u => u.hasDevice()
      },
      filter: relation => relation
    },

    users: {
      model: User,
      attributes: ['id', 'name', 'avatar_url'],
      relations: ['posts'],
      filter: relation => relation.query(q => {
        q.where('users.id', 'in', Membership.query().select('user_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    posts: {
      model: Post,
      attributes: ['id', 'created_at'],
      getters: {
        title: p => p.get('name'),
        details: p => p.get('description')
      },
      relations: ['communities', 'followers'],
      filter: relation => relation.query(q => {
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
      filter: relation => relation.query(q => {
        q.where('communities.id', 'in', myCommunityIds())
      })
    }
  }
}
