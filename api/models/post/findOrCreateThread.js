/* globals LastRead */
import { flattenDeep, pick } from 'lodash'
import { map } from 'lodash/fp'

export const findThread = (userId, participantIds) =>
  Post.query(q => {
    q.where('posts.type', Post.Type.THREAD)
    q.where('posts.id', 'in', Follow.query().where('user_id', userId).select('post_id'))
    participantIds.forEach(id => q.where('posts.id', 'in', Follow.query().where('user_id', id).select('post_id')))
    q.where('posts.id', 'not in', Follow.query().where('user_id', 'not in', [userId].concat(participantIds)).select('post_id'))
    q.groupBy('posts.id')
  }).fetch()

export default function findOrCreateThread (userId, participantIds) {
  return findThread(userId, participantIds)
  .then(post => post || createThread(userId, participantIds))
}

function createThread (userId, participantIds) {
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
    user_id: userId
  })
}

function afterSavingThread (thread, opts) {
  const userId = thread.get('user_id')
  const participantIds = [userId].concat(opts.participantIds)
  const trxOpts = pick(opts, 'transacting')

  return Promise.all(flattenDeep([
    map(id => LastRead.findOrCreate(id, thread.id, trxOpts), participantIds),
    thread.addFollowers(participantIds, userId, trxOpts)
  ]))
}
