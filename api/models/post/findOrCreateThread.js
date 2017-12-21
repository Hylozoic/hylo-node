import { pick } from 'lodash'
import { map, uniq } from 'lodash/fp'
import { isFollowing } from '../group/queryUtils'

export const findThread = userIds => {
  const subquery = Group.havingExactMembers(userIds, Post)
  .query(isFollowing)
  .query().select('group_data_id')

  return Post.where({id: subquery, type: Post.Type.THREAD}).fetch()
}

export default function findOrCreateThread (userId, participantIds) {
  return findThread(uniq([userId].concat(participantIds)))
  .then(post => post || createThread(userId, uniq(participantIds)))
}

export function createThread (userId, participantIds) {
  return setupNewThreadAttrs(userId)
  .then(attrs => bookshelf.transaction(trx =>
    Post.create(attrs, {transacting: trx})
    .tap(thread => afterSavingThread(thread, {participantIds, transacting: trx}))))
}

export function validateThreadData (userId, data) {
  const { participantIds } = data
  if (!(participantIds && participantIds.length)) {
    throw new Error("participantIds can't be empty")
  }
  const checkForSharedCommunity = (id) =>
    Membership.inSameCommunity([userId, id])
    .then(doesShare => {
      if (doesShare) {
        return Promise.resolve()
      } else {
        throw new Error(`no shared communities with user ${id}`)
      }
    })
  return Promise.all(map(checkForSharedCommunity, participantIds))
}

function setupNewThreadAttrs (userId) {
  return Promise.resolve({
    type: Post.Type.THREAD,
    visibility: Post.Visibility.DEFAULT,
    user_id: userId,
    link_preview_id: null
  })
}

function afterSavingThread (thread, opts) {
  const userId = thread.get('user_id')
  const participantIds = uniq([userId].concat(opts.participantIds))
  const trxOpts = pick(opts, 'transacting')

  return thread.addFollowers(participantIds, trxOpts)
}
