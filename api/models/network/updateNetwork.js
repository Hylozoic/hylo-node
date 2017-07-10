import { isEqual, difference, values } from 'lodash'
import setupNetworkAttrs from './setupNetworkAttrs'

export default function updateNetwork (userId, id, params) {
  if (!userId) throw new Error('updateNetwork called with no userID')
  if (!id) throw new Error('updateNetwork called with no ID')
  return setupNetworkAttrs(userId, params).then(attrs =>
    bookshelf.transaction(transacting =>
      // NOTE: EnsureLoad not built to work with belongsToMany relations
      Network.find(id, {withRelated: 'communities'}).then(network => {
        return network.save(attrs, {patch: true, transacting})
        .tap(updatedNetwork => afterUpdatingNetwork(updatedNetwork, {params, userId, transacting}))
      })
    )
  )
}

export function afterUpdatingNetwork (network, opts) {
  const {
    params: { community_ids },
    transacting
  } = opts
  return Promise.all([
    updateCommunities(network, values(community_ids), transacting)
  ])
}

export function updateCommunities (network, newCommunityIds, transacting) {
  const oldCommunityIds = network.relations.communities.pluck('id')
  if (!isEqual(newCommunityIds, oldCommunityIds)) {
    const opts = { transacting }
    const communitiesToAdd = difference(newCommunityIds, oldCommunityIds)
    const communitesToRemove = difference(newCommunityIds, oldCommunityIds)
    return Promise.all([
      // communitiesToAdd.forEach(communityId =>
      //   Community.find(communityId, opts).then(community =>
      //     community && community.save({network_id: network.id}, opts)
      //   )
      // ),
      // communitesToRemove.forEach(communityId =>
      //   Community.find(communityId, opts).then(community =>
      //     community && community.save({network_id: null}, opts)
      //   )
      // )
    ])
  }
}
