import { isEmpty, mapKeys, pick, snakeCase, size, trim } from 'lodash'
import underlyingFindOrCreateThread, {
  validateThreadData
} from '../../models/post/findOrCreateThread'
import underlyingFindLinkPreview from '../../models/linkPreview/findOrCreateByUrl'
import convertGraphqlData from './convertGraphqlData'

export { createComment, deleteComment, canDeleteComment } from './comment'
export { updateNetwork } from './network'
export { registerDevice } from './mobile'
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
  deletePost
} from './post'

export function updateMe (userId, changes) {
  return User.find(userId)
  .then(user => user.validateAndSave(convertGraphqlData(changes)))
}

export function leaveCommunity (userId, communityId) {
  return User.find(userId)
  .then(user => user.leaveCommunity(communityId))
}

export function findOrCreateThread (userId, data) {
  return validateThreadData(userId, data)
  .then(() => underlyingFindOrCreateThread(userId, data.participantIds))
}

export function findOrCreateLinkPreviewByUrl (data) {
  return underlyingFindLinkPreview(data.url)
}

export function subscribe (userId, topicId, communityId, isSubscribing) {
  return TagFollow.subscribe(topicId, userId, communityId, isSubscribing)
}

export function updateMembership (userId, { communityId, data }) {
  const settings = convertGraphqlData(data.settings)
  const whitelist = mapKeys(pick(data, [
    'newPostCount',
    'lastViewedAt'
  ]), (v, k) => snakeCase(k))
  if (isEmpty(whitelist) && isEmpty(settings)) return Promise.resolve(null)

  return Membership.find(userId, communityId)
  .then(membership => {
    if (!membership) throw new Error("Couldn't find membership for community with id", communityId)

    return isEmpty(settings)
      ? Promise.resolve(membership)
      : membership.addSetting(settings)
  })
  .then(membership =>
    // if settings is not empty, it saves the membership anyway as settings have
    // been added above
    isEmpty(whitelist) && isEmpty(settings)
      ? Promise.resolve(membership)
      : membership.save(whitelist))
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

export function addSkill (userId, name) {
  name = trim(name)
  if (isEmpty(name)) {
    throw new Error('Skill cannot be blank')
  } else if (size(name) > 39) {
    throw new Error('Skill must be less than 40 characters')
  }
  return Skill.find(name)
  .then(skill => {
    if (!skill) return new Skill({name}).save()
    return skill
  })
  .tap(skill => skill.users().attach(userId))
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
      throw new Error('Invalid Link Type')
  }

  return FlaggedItem.create({
    user_id: userId,
    category,
    reason,
    link
  })
  .then(() => ({success: true}))
}

export function removePost (userId, postId, communityIdOrSlug) {
  return Promise.join(
    Post.find(postId),
    Membership.hasModeratorRole(userId, communityIdOrSlug),
    (post, isModerator) => {
      if (!post) throw new Error(`Couldn't find post with id ${postId}`)
      if (!isModerator) throw new Error(`You don't have permission to remove this post`)
      return post.removeFromCommunity(communityIdOrSlug)
    })
  .then(() => ({success: true}))
}
