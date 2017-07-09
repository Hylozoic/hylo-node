import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'

export default function networkMembersQuerySet (n, { search, first, offset = 0, sortBy, autocomplete }) {
  return User.query(q => {
    q.distinct()
    q.where({'networks.id': n.id})
    q.join('communities_users', 'users.id', 'communities_users.user_id')
    q.join('communities', 'communities.id', 'communities_users.community_id')
    q.join('networks', 'networks.id', 'communities.network_id')
  })
  .fetchAll()
  .then(({ models }) =>
    presentQuerySet(models, { first, offset })
  )
}
