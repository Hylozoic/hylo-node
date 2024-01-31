import { pick } from 'lodash'
import { uniq } from 'lodash/fp'
import { personFilter } from '../../graphql/filters'
const { GraphQLYogaError } = require('@graphql-yoga/node')

export function findThread (userIds) {
  return Post.havingExactFollowers(userIds)
    .query(q => q.where('posts_users.following', true).where({ type: Post.Type.THREAD }))
    .fetch()
}

export default async function findOrCreateThread (userId, participantIds, skipValidation = false) {
  const post = await findThread(uniq([userId].concat(participantIds)))
  if (post) return post
  if (skipValidation || await validateThreadData(userId, participantIds)) {
    return createThread(userId, uniq(participantIds))
  }
}

export async function createThread (userId, participantIds) {
  const attrs = await setupNewThreadAttrs(userId)
  let thread
  await bookshelf.transaction(async trx => {
    thread = await Post.create(attrs, { transacting: trx })
    await afterSavingThread(thread, { participantIds, transacting: trx })
  })
  return thread
}

export async function validateThreadData (userId, participantIds) {
  if (!(participantIds && participantIds.length)) {
    throw new GraphQLYogaError("participantIds can't be empty")
  }
  const validParticipantIds = await personFilter(userId)(User.where('id', 'in', uniq(participantIds))).fetchAll()
  if (validParticipantIds.length !== participantIds.length) {
    throw new GraphQLYogaError("Cannot message a participant who doesn't share a group")
  }
  return true
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
