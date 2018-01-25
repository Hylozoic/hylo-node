import { isEmpty, mapKeys, pick, snakeCase, size, trim } from 'lodash'
import underlyingFindOrCreateThread, {
  validateThreadData
} from '../../models/post/findOrCreateThread'
import underlyingFindLinkPreview from '../../models/linkPreview/findOrCreateByUrl'
import convertGraphqlData from './convertGraphqlData'

export { createComment, deleteComment, canDeleteComment } from './comment'
export {
  addCommunityToNetwork,
  addNetworkModeratorRole,
  removeCommunityFromNetwork,
  removeNetworkModeratorRole,
  updateNetwork
} from './network'
export { registerDevice } from './mobile'
export { subscribe } from './topic'
export {
  createInvitation,
  expireInvitation,
  resendInvitation,
  reinviteAll,
  useInvitation
} from './invitation'
export {
  updateCommunity,
  addModerator,
  removeModerator,
  removeMember,
  regenerateAccessCode,
  createCommunity
} from './community'
export {
  createPost,
  updatePost,
  vote,
  deletePost,
  pinPost
} from './post'
export { updateMembership } from './membership'

export function updateMe (userId, changes) {
  return User.find(userId)
  .then(user => user.validateAndSave(convertGraphqlData(changes)))
}

export async function leaveCommunity (userId, communityId) {
  const community = await Community.find(communityId)
  const user = await User.find(userId)
  return user.leaveCommunity(community)
}

export function findOrCreateThread (userId, data) {
  return validateThreadData(userId, data)
  .then(() => underlyingFindOrCreateThread(userId, data.participantIds))
}

export function findOrCreateLinkPreviewByUrl (data) {
  return underlyingFindLinkPreview(data.url)
}

export function updateCommunityTopic (userId, { id, data }) {
  const whitelist = mapKeys(pick(data, 'newPostCount'), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return CommunityTag.where({id}).fetch()
  .then(ct => ct.tagFollow(userId).query().update(whitelist))
  .then(() => ({success: true}))
}

export function markActivityRead (userId, activityid) {
  return Activity.find(activityid)
  .then(a => {
    if (a.get('reader_id') !== userId) return
    return a.save({unread: false})
  })
}

export function markAllActivitiesRead (userId) {
  return Activity.query().where('reader_id', userId).update({unread: false})
  .then(() => ({success: true}))
}

export function unlinkAccount (userId, provider) {
  return User.find(userId)
  .then(user => {
    if (!user) throw new Error(`Couldn't find user with id ${userId}`)
    return user.unlinkAccount(provider)
  })
  .then(() => ({success: true}))
}

export async function addSkill (userId, name) {
  name = trim(name)
  if (isEmpty(name)) {
    throw new Error('Skill cannot be blank')
  } else if (size(name) > 39) {
    throw new Error('Skill must be less than 40 characters')
  }
  let skill
  try {
    skill = await Skill.forge({name}).save()
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate')) {
      throw err
    }
    skill = await Skill.find(name)
  }

  try {
    await skill.users().attach(userId)
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate')) {
      throw err
    }
  }

  return skill
}

export function removeSkill (userId, skillIdOrName) {
  return Skill.find(skillIdOrName)
  .then(skill => {
    if (!skill) throw new Error(`Couldn't find skill with ID or name ${skillIdOrName}`)
    return skill.users().detach(userId)
  })
  .then(() => ({success: true}))
}

export function flagInappropriateContent (userId, { category, reason, linkData }) {
  let link
  // TODO use FlaggedItem.Type
  switch (trim(linkData.type)) {
    case 'post':
      link = Frontend.Route.post(linkData.id, linkData.slug)
      break
    case 'comment':
      link = Frontend.Route.thread(linkData.id)
      break
    case 'member':
      link = Frontend.Route.profile(linkData.id)
      break
    default:
      return Promise.reject(new Error('Invalid Link Type'))
  }

  return FlaggedItem.create({
    user_id: userId,
    category,
    reason,
    link,
    object_id: linkData.id,
    object_type: linkData.type
  })
  .tap(flaggedItem => Queue.classMethod('FlaggedItem', 'notifyModerators', {id: flaggedItem.id}))
  .then(() => ({success: true}))
}

export async function removePost (userId, postId, communityIdOrSlug) {
  const community = await Community.find(communityIdOrSlug)
  return Promise.join(
    Post.find(postId),
    GroupMembership.hasModeratorRole(userId, community),
    (post, isModerator) => {
      if (!post) throw new Error(`Couldn't find post with id ${postId}`)
      if (!isModerator) throw new Error(`You don't have permission to remove this post`)
      return post.removeFromCommunity(communityIdOrSlug)
    })
  .then(() => ({success: true}))
}
