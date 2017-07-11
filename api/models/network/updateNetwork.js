import { isEqual, difference, values, some } from 'lodash'
import setupNetworkAttrs from './setupNetworkAttrs'

export default function updateNetwork (userId, id, params) {
  if (!userId) throw new Error('updateNetwork called with no userID')
  if (!id) throw new Error('updateNetwork called with no ID')
  return setupNetworkAttrs(userId, params).then(attrs =>
    bookshelf.transaction(transacting =>
      // NOTE: EnsureLoad not built to work with belongsToMany relations
      Network.find(id, {withRelated: ['communities', 'moderators']}).then(network => {
        return network.save(attrs, {patch: true, transacting})
        .tap(updatedNetwork => afterUpdatingNetwork(updatedNetwork, {params, userId, transacting}))
      })
    )
  )
}

export function afterUpdatingNetwork (network, opts) {
  const {
    params: {
      community_ids,
      moderator_ids
    },
    transacting
  } = opts
  return Promise.all([
    updateCommunities(network, community_ids && values(community_ids), transacting), // eslint-disable-line camelcase
    updateModerators(network, moderator_ids && values(moderator_ids), transacting) // eslint-disable-line camelcase
  ])
}

export function updateCommunities (network, newCommunityIds, transacting) {
  if (!newCommunityIds) return
  const currentCommunityIds = network.relations.communities.pluck('id')
  if (!isEqual(newCommunityIds, currentCommunityIds)) {
    const communitiesToAdd = difference(newCommunityIds, currentCommunityIds)
    const communitesToRemove = difference(currentCommunityIds, newCommunityIds)
    return Promise.all([
      // Add communities
      some(communitiesToAdd) && Community.query().where('id', 'in', communitiesToAdd)
      .update('network_id', network.id).transacting(transacting),
      // Remove communities
      some(communitesToRemove) && Community.query().where('id', 'in', communitesToRemove)
      .update('network_id', null).transacting(transacting)
    ])
  }
}

export function updateModerators (network, newModeratorIds, transacting) {
  if (!newModeratorIds) return
  const currentModeratorIds = network.relations.moderators.pluck('id')
  if (!isEqual(newModeratorIds, currentModeratorIds)) {
    const opts = { transacting }
    const moderators = network.moderators()
    const moderatorsToAdd = difference(newModeratorIds, currentModeratorIds)
    const moderatorsToRemove = difference(currentModeratorIds, newModeratorIds)
    return Promise.join(
      Promise.map(moderatorsToAdd, userId => NetworkMembership.addModerator(userId, network.id, opts)),
      Promise.map(moderatorsToRemove, userId => moderators.detach(userId, opts))
    )
  }
}
