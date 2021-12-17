import { isEmpty, mapKeys, pick, snakeCase, size, trim } from 'lodash'
import underlyingFindOrCreateThread, {
  validateThreadData
} from '../../models/post/findOrCreateThread'
import underlyingFindLinkPreview from '../../models/linkPreview/findOrCreateByUrl'
import convertGraphqlData from './convertGraphqlData'

export {
  createAffiliation,
  deleteAffiliation
} from './affiliation'
export {
  createComment,
  createMessage,
  deleteComment,
  canDeleteComment,
  updateComment,
  canUpdateComment
} from './comment'
export {
  respondToEvent,
  invitePeopleToEvent
} from './event'
export {
  acceptGroupRelationshipInvite,
  addModerator,
  cancelGroupRelationshipInvite,
  createGroup,
  deleteGroup,
  deleteGroupRelationship,
  deleteGroupTopic,
  inviteGroupToGroup,
  joinGroup,
  regenerateAccessCode,
  rejectGroupRelationshipInvite,
  removeModerator,
  removeMember,
  updateGroup
} from './group'
export {
  createInvitation,
  expireInvitation,
  resendInvitation,
  reinviteAll,
  useInvitation
} from './invitation'
export {
  acceptJoinRequest,
  cancelJoinRequest,
  createJoinRequest,
  declineJoinRequest
} from './join_request'
export {
  findOrCreateLocation
} from './location'
export { updateMembership } from './membership'
export { registerDevice } from './mobile'
export {
  createPost,
  fulfillPost,
  unfulfillPost,
  updatePost,
  vote,
  deletePost,
  pinPost
} from './post'
export {
  addPeopleToProjectRole,
  createProject,
  createProjectRole,
  deleteProjectRole,
  joinProject,
  leaveProject,
  processStripeToken
} from './project'
export { deleteSavedSearch, createSavedSearch } from './savedSearch'
export {
  createTopic,
  subscribe
} from './topic'
export {
  blockUser,
  deactivateUser,
  deleteUser,
  reactivateUser,
  registerStripeAccount,
  unblockUser,
  updateStripeAccount
} from './user'

export function updateMe (sessionId, userId, changes) {
  return User.find(userId)
  .then(user => user.validateAndSave(sessionId, convertGraphqlData(changes)))
}

export function allowGroupInvites (groupId, data) {
  return Group.where('id', groupId).fetch()
    .then(g => g.addSetting({ allow_group_invites: data }, true))
    .then(() => ({ success: true }))
}

export async function leaveGroup (userId, groupId) {
  const group = await Group.find(groupId)
  const user = await User.find(userId)
  await user.leaveGroup(group)
  return groupId
}

export function findOrCreateThread (userId, data) {
  return validateThreadData(userId, data)
  .then(() => underlyingFindOrCreateThread(userId, data.participantIds))
}

export function findOrCreateLinkPreviewByUrl (data) {
  return underlyingFindLinkPreview(data.url)
}

export function updateGroupTopic (id, data) {
  const whitelist = mapKeys(pick(data, ['visibility', 'isDefault']), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return GroupTag.query().where({id}).update(whitelist)
  .then(() => ({success: true}))
}

export function updateGroupTopicFollow (userId, { id, data }) {
  const whitelist = mapKeys(pick(data, 'newPostCount'), (v, k) => snakeCase(k))
  if (isEmpty(whitelist)) return Promise.resolve(null)

  return GroupTag.where({id}).fetch()
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

async function createSkill(name) {
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
  return skill
}

export async function addSkill (userId, name) {
  const skill = await createSkill(name)

  try {
    await skill.users().attach({ user_id: userId })
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate')) {
      throw err
    }
  }

  return skill
}

export async function addSkillToLearn (userId, name) {
  const skill = await createSkill(name)

  try {
    await skill.usersLearning().attach({ user_id: userId, type: Skill.Type.LEARNING })
  } catch (err) {
    if (!err.message || !err.message.includes('duplicate')) {
      throw err
    }
  }

  return skill
}

export async function addSuggestedSkillToGroup (userId, groupId, name) {
  const group = await Group.find(groupId)
  if (!group) throw new Error(`Invalid group`)
  const isModerator = GroupMembership.hasModeratorRole(userId, group)
  if (!isModerator) throw new Error(`You don't have permission`)

  const skill = await createSkill(name)

  try {
    await group.suggestedSkills().attach({ skill_id: skill.id })
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
    return skill.users().detach({ user_id: userId, type: Skill.Type.HAS })
  })
  .then(() => ({success: true}))
}

export function removeSkillToLearn (userId, skillIdOrName) {
  return Skill.find(skillIdOrName)
  .then(skill => {
    if (!skill) throw new Error(`Couldn't find skill with ID or name ${skillIdOrName}`)
    return skill.usersLearning().detach({ user_id: userId, type: Skill.Type.LEARNING })
  })
  .then(() => ({success: true}))
}

export async function removeSuggestedSkillFromGroup (userId, groupId, skillIdOrName) {
  const group = await Group.find(groupId)
  if (!group) throw new Error(`Invalid group`)
  const isModerator = GroupMembership.hasModeratorRole(userId, group)
  if (!isModerator) throw new Error(`You don't have permission`)

  return Skill.find(skillIdOrName)
    .then(skill => {
      if (!skill) throw new Error(`Couldn't find skill with ID or name ${skillIdOrName}`)
      return group.suggestedSkills().detach({ skill_id: skill.id })
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

export async function removePost (userId, postId, groupIdOrSlug) {
  const group = await Group.find(groupIdOrSlug)
  return Promise.join(
    Post.find(postId),
    GroupMembership.hasModeratorRole(userId, group),
    (post, isModerator) => {
      if (!post) throw new Error(`Couldn't find post with id ${postId}`)
      if (!isModerator) throw new Error(`You don't have permission to remove this post`)
      return post.removeFromGroup(groupIdOrSlug)
    })
  .then(() => ({success: true}))
}

export function updateWidget (id, changes) {
  return GroupWidget.update(id, convertGraphqlData(changes))
}
