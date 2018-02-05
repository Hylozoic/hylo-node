import { pick } from 'lodash'
import { map, uniq } from 'lodash/fp'
import { isFollowing } from '../group/queryUtils'

export function findThread (userIds) {
  const subquery = Group.havingExactMembers(userIds, Post)
  .query(isFollowing)
  .query().select('group_data_id')

  return Post.where({id: subquery, type: Post.Type.THREAD}).fetch()
}

export default function findOrCreateThread (userId, participantIds) {
  return findThread(uniq([userId].concat(participantIds)))
  .then(post => post || createThread(userId, uniq(participantIds)))
}

export async function createThread (userId, participantIds) {
  const attrs = await setupNewThreadAttrs(userId)
  let thread
  await bookshelf.transaction(async trx => {
    thread = await Post.create(attrs, {transacting: trx})
    await afterSavingThread(thread, {participantIds, transacting: trx})
  })
  return thread
}

export function validateThreadData (userId, data) {
  const { participantIds } = data
  if (!(participantIds && participantIds.length)) {
    throw new Error("participantIds can't be empty")
  }
  const checkForSharedCommunity = id =>
    Group.inSameGroup([userId, id], Community)
    .then(doesShare => {
      if (!doesShare) throw new Error(`no shared communities with user ${id}`)
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

async function afterSavingThread (thread, opts) {
  const userId = thread.get('user_id')
  const participantIds = uniq([userId].concat(opts.participantIds))
  const trxOpts = pick(opts, 'transacting')

  const followers = await thread.addFollowers(participantIds, {}, trxOpts)
  return followers
}
