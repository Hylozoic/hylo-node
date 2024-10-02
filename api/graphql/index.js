import { useLazyLoadedSchema } from '@envelop/core'
import { readFileSync } from 'fs'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'
import mixpanel from '../../lib/mixpanel'
import {
  acceptGroupRelationshipInvite,
  acceptJoinRequest,
  addGroupResponsibility,
  addGroupRole,
  addMember,
  addModerator,
  addPeopleToProjectRole,
  addPostToCollection,
  addResponsibilityToRole,
  addProposalVote,
  addRoleToMember,
  addSkill,
  addSkillToLearn,
  addSuggestedSkillToGroup,
  allowGroupInvites,
  blockUser,
  cancelGroupRelationshipInvite,
  cancelJoinRequest,
  clearModerationAction,
  createAffiliation,
  createCollection,
  createComment,
  createGroup,
  createInvitation,
  createJoinRequest,
  createMessage,
  createModerationAction,
  createPost,
  createProject,
  createProjectRole,
  createSavedSearch,
  createZapierTrigger,
  login,
  createTopic,
  deactivateUser,
  deleteUser,
  declineJoinRequest,
  deleteAffiliation,
  deleteComment,
  deleteGroup,
  deleteGroupRelationship,
  deleteGroupResponsibility,
  deleteGroupTopic,
  deletePost,
  deleteProjectRole,
  deleteReaction,
  deleteSavedSearch,
  deleteZapierTrigger,
  expireInvitation,
  findOrCreateLinkPreviewByUrl,
  findOrCreateLocation,
  findOrCreateThread,
  flagInappropriateContent,
  fulfillPost,
  inviteGroupToGroup,
  invitePeopleToEvent,
  joinGroup,
  joinProject,
  leaveGroup,
  leaveProject,
  logout,
  markActivityRead,
  markAllActivitiesRead,
  messageGroupStewards,
  pinPost,
  processStripeToken,
  reactOn,
  reactivateUser,
  recordClickthrough,
  regenerateAccessCode,
  registerDevice,
  registerStripeAccount,
  reinviteAll,
  rejectGroupRelationshipInvite,
  register,
  reorderPostInCollection,
  removeMember,
  removeModerator,
  removePost,
  removePostFromCollection,
  removeResponsibilityFromRole,
  removeRoleFromMember,
  removeProposalVote,
  removeSkill,
  removeSkillToLearn,
  removeSuggestedSkillFromGroup,
  resendInvitation,
  respondToEvent,
  sendEmailVerification,
  sendPasswordReset,
  setProposalOptions,
  subscribe,
  swapProposalVote,
  unblockUser,
  unfulfillPost,
  unlinkAccount,
  updateComment,
  updateGroup,
  updateGroupResponsibility,
  updateGroupRole,
  updateGroupTopic,
  updateGroupTopicFollow,
  updateMe,
  updateMembership,
  updatePost,
  updateProposalOptions,
  updateProposalOutcome,
  updateStripeAccount,
  updateWidget,
  useInvitation,
  verifyEmail
} from './mutations'
import InvitationService from '../services/InvitationService'
import makeModels from './makeModels'
import { makeExecutableSchema } from 'graphql-tools'
import { inspect } from 'util'
import { red } from 'chalk'
import { merge, reduce } from 'lodash'
const { createServer, GraphQLYogaError } = require('@graphql-yoga/node')

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()

export const createRequestHandler = () =>
  createServer({
    plugins: [useLazyLoadedSchema(createSchema)],
    context: async ({ query, req, variables }) => {
      if (process.env.DEBUG_GRAPHQL) {
        sails.log.info('\n' +
          red('graphql query start') + '\n' +
          query + '\n' +
          red('graphql query end')
        )
        sails.log.info(inspect(variables))
      }

      // Update user last active time unless this is an oAuth login
      if (req.session.userId && !req.api_client) {
        await User.query().where({ id: req.session.userId }).update({ last_active_at: new Date() })
      }
    },
    graphiql: true
  })

function createSchema (expressContext) {
  const { req } = expressContext
  const { api_client, session } = req
  const userId = session.userId
  const isAdmin = Admin.isSignedIn(req)
  const models = makeModels(userId, isAdmin, api_client)
  const { resolvers, fetchOne, fetchMany } = setupBridge(models)

  let allResolvers
  if (userId) {
    // authenticated users
    // TODO: look for api_client.scope to see what an oAuthed user is allowed to access

    mixpanel.people.set(userId)

    allResolvers = {
      Query: makeAuthenticatedQueries(userId, fetchOne, fetchMany),
      Mutation: makeMutations(expressContext, userId, isAdmin, fetchOne),

      FeedItemContent: {
        __resolveType (data, context, info) {
          if (data instanceof bookshelf.Model) {
            return info.schema.getType('Post')
          }
          throw new GraphQLYogaError('Post is the only implemented FeedItemContent type')
        }
      },

      SearchResultContent: {
        __resolveType (data, context, info) {
          return getTypeForInstance(data, models)
        }
      }
    }
  } else if (api_client) {
    // TODO: check scope here, just api:write, just api:read, or both?
    allResolvers = {
      Query: makeApiQueries(fetchOne, fetchMany),
      Mutation: makeApiMutations()
    }
  } else {
    // Not authenticated, only allow for public queries
    allResolvers = {
      Query: makePublicQueries(userId, fetchOne, fetchMany),
      Mutation: makePublicMutations(expressContext, fetchOne)
    }
  }

  return makeExecutableSchema({
    typeDefs: [schemaText],
    resolvers: Object.assign(allResolvers, resolvers)
  })
}

// Queries that non-logged in users can make
export function makePublicQueries (userId, fetchOne, fetchMany) {
  return {
    checkInvitation: (root, { invitationToken, accessCode }) =>
      InvitationService.check(invitationToken, accessCode),
    // Can only access public communities and posts
    group: async (root, { id, slug }) => fetchOne('Group', slug || id, slug ? 'slug' : 'id', { visibility: Group.Visibility.PUBLIC }),
    groups: (root, args) => fetchMany('Group', Object.assign(args, { visibility: Group.Visibility.PUBLIC })),
    platformAgreements: (root, args) => PlatformAgreement.fetchAll(args),
    post: (root, { id }) => fetchOne('Post', id, 'id', { isPublic: true }),
    posts: (root, args) => fetchMany('Post', Object.assign(args, { isPublic: true }))
  }
}

// Queries that logged in users can make
export function makeAuthenticatedQueries (userId, fetchOne, fetchMany) {
  return {
    activity: (root, { id }) => fetchOne('Activity', id),
    checkInvitation: (root, { invitationToken, accessCode }) =>
      InvitationService.check(invitationToken, accessCode),
    collection: (root, { id }) => fetchOne('Collection', id),
    comment: (root, { id }) => fetchOne('Comment', id),
    commonRoles: (root, args) => CommonRole.fetchAll(args),
    connections: (root, args) => fetchMany('PersonConnection', args),
    group: async (root, { id, slug, updateLastViewed }) => {
      // you can specify id or slug, but not both
      const group = await fetchOne('Group', slug || id, slug ? 'slug' : 'id')
      if (updateLastViewed && group) {
        // Resets new post count to 0
        await GroupMembership.updateLastViewedAt(userId, group)
      }
      return group
    },
    groupExists: (root, { slug }) => {
      if (Group.isSlugValid(slug)) {
        return Group.where(bookshelf.knex.raw('slug = ?', slug))
          .count()
          .then(count => {
            if (count > 0) return { exists: true }
            return { exists: false }
          })
      }
      throw new GraphQLYogaError('Slug is invalid')
    },
    groupExtension: (root, args) => fetchOne('GroupExtension', args),
    groupExtensions: (root, args) => fetchMany('GroupExtension', args),
    groupTopic: (root, { topicName, groupSlug }) =>
      GroupTag.findByTagAndGroup(topicName, groupSlug),
    groupTopics: (root, args) => fetchMany('GroupTopic', args),
    groups: (root, args) => fetchMany('Group', args),
    joinRequests: (root, args) => fetchMany('JoinRequest', args),
    me: () => fetchOne('Me', userId),
    messageThread: (root, { id }) => fetchOne('MessageThread', id),
    moderationActions: (root, args) => fetchMany('ModerationAction', args),
    notifications: (root, { first, offset, resetCount, order = 'desc' }) => {
      return fetchMany('Notification', { first, offset, order })
        .tap(() => resetCount && User.resetNewNotificationCount(userId))
    },
    people: (root, args) => fetchMany('Person', args),
    // you can query by id or email, with id taking preference
    person: (root, { id, email }) => fetchOne('Person', id || email, id ? 'id' : 'email'),
    platformAgreements: (root, args) => PlatformAgreement.fetchAll(args),
    post: (root, { id }) => fetchOne('Post', id),
    posts: (root, args) => fetchMany('Post', args),
    responsibilities: (root, args) => Responsibility.fetchAll(args),
    savedSearches: (root, args) => fetchMany('SavedSearch', args),
    search: (root, args) => {
      if (!args.first) args.first = 20
      return Search.fullTextSearch(userId, args)
        .then(({ models, total }) => {
          // FIXME this shouldn't be used directly here -- there should be some
          // way of integrating this into makeModels and using the presentation
          // logic that's already in the fetcher
          return presentQuerySet(models, merge(args, { total }))
        })
    },
    skills: (root, args) => fetchMany('Skill', args),
    topic: (root, { id, name }) => // you can specify id or name, but not both
      fetchOne('Topic', name || id, name ? 'name' : 'id'),
    topics: (root, args) => fetchMany('Topic', args)
  }
}

export function makePublicMutations (expressContext, fetchOne) {
  return {
    login: login(fetchOne, expressContext),
    logout: logout(expressContext),
    sendEmailVerification,
    sendPasswordReset,
    register: register(fetchOne, expressContext),
    verifyEmail: verifyEmail(fetchOne, expressContext)
  }
}

export function makeMutations (expressContext, userId, isAdmin, fetchOne) {
  const { req } = expressContext
  const sessionId = req.session.id

  return {
    // Currently injecting all Public Mutations here so those resolvers remain
    // available between auth'd and non-auth'd sessions
    ...makePublicMutations(expressContext, fetchOne),

    acceptGroupRelationshipInvite: (root, { groupRelationshipInviteId }) => acceptGroupRelationshipInvite(userId, groupRelationshipInviteId),

    acceptJoinRequest: (root, { joinRequestId }) => acceptJoinRequest(userId, joinRequestId),

    addGroupResponsibility: (root, { groupId, title, description }) => addGroupResponsibility({ userId, groupId, title, description }),

    addGroupRole: (root, { groupId, color, name, description, emoji }) => addGroupRole({ userId, groupId, color, name, description, emoji }),

    addModerator: (root, { personId, groupId }) =>
      addModerator(userId, personId, groupId),

    addPeopleToProjectRole: (root, { peopleIds, projectRoleId }) =>
      addPeopleToProjectRole(userId, peopleIds, projectRoleId),

    addPostToCollection: (root, { collectionId, postId }) =>
      addPostToCollection(userId, collectionId, postId),

    addProposalVote: (root, { postId, optionId }) => addProposalVote({ userId, postId, optionId }),

    addResponsibilityToRole: (root, { responsibilityId, roleId, groupId }) =>
      addResponsibilityToRole({ userId, responsibilityId, roleId, groupId }),

    addRoleToMember: (root, { personId, roleId, groupId, isCommonRole = false }) => addRoleToMember({ userId, personId, roleId, groupId, isCommonRole }),

    addSkill: (root, { name }) => addSkill(userId, name),
    addSkillToLearn: (root, { name }) => addSkillToLearn(userId, name),
    addSuggestedSkillToGroup: (root, { groupId, name }) => addSuggestedSkillToGroup(userId, groupId, name),

    allowGroupInvites: (root, { groupId, data }) => allowGroupInvites(groupId, data),

    blockUser: (root, { blockedUserId }) => blockUser(userId, blockedUserId),

    cancelGroupRelationshipInvite: (root, { groupRelationshipInviteId }) => cancelGroupRelationshipInvite(userId, groupRelationshipInviteId),

    cancelJoinRequest: (root, { joinRequestId }) => cancelJoinRequest(userId, joinRequestId),

    clearModerationAction: (root, { postId, groupId, moderationActionId }) => clearModerationAction({ userId, postId, groupId, moderationActionId }),

    createAffiliation: (root, { data }) => createAffiliation(userId, data),

    createCollection: (root, { data }) => createCollection(userId, data),

    createComment: (root, { data }) => createComment(userId, data),

    createGroup: (root, { data }) => createGroup(userId, data),

    createInvitation: (root, { groupId, data }) =>
      createInvitation(userId, groupId, data), // consider sending locale from the frontend here

    createJoinRequest: (root, { groupId, questionAnswers }) => createJoinRequest(userId, groupId, questionAnswers),

    createMessage: (root, { data }) => createMessage(userId, data),

    createModerationAction: (root, { data }) => createModerationAction({ data, userId }),

    createPost: (root, { data }) => createPost(userId, data),

    createProject: (root, { data }) => createProject(userId, data),

    createProjectRole: (root, { projectId, roleName }) => createProjectRole(userId, projectId, roleName),

    createSavedSearch: (root, { data }) => createSavedSearch(data),

    createZapierTrigger: (root, { groupIds, targetUrl, type, params }) => createZapierTrigger(userId, groupIds, targetUrl, type, params),

    joinGroup: (root, { groupId, questionAnswers }) => joinGroup(groupId, userId, questionAnswers),

    joinProject: (root, { id }) => joinProject(id, userId),

    createTopic: (root, { topicName, groupId, isDefault, isSubscribing }) => createTopic(userId, topicName, groupId, isDefault, isSubscribing),

    deactivateMe: (root) => deactivateUser({ sessionId, userId }),

    declineJoinRequest: (root, { joinRequestId }) => declineJoinRequest(userId, joinRequestId),

    deleteAffiliation: (root, { id }) => deleteAffiliation(userId, id),

    deleteComment: (root, { id }) => deleteComment(userId, id),

    deleteGroup: (root, { id }) => deleteGroup(userId, id),

    deleteGroupRelationship: (root, { parentId, childId }) => deleteGroupRelationship(userId, parentId, childId),

    deleteGroupResponsibility: (root, { responsibilityId, groupId }) =>
      deleteGroupResponsibility({ userId, responsibilityId, groupId }),

    deleteGroupTopic: (root, { id }) => deleteGroupTopic(userId, id),

    deleteMe: (root) => deleteUser({ sessionId, userId }),

    deletePost: (root, { id }) => deletePost(userId, id),

    deleteProjectRole: (root, { id }) => deleteProjectRole(userId, id),

    deleteReaction: (root, { entityId, data }) => deleteReaction(userId, entityId, data),

    deleteSavedSearch: (root, { id }) => deleteSavedSearch(id),

    deleteZapierTrigger: (root, { id }) => deleteZapierTrigger(userId, id),

    expireInvitation: (root, { invitationId }) =>
      expireInvitation(userId, invitationId),

    findOrCreateThread: (root, { data }) => findOrCreateThread(userId, data.participantIds),

    findOrCreateLinkPreviewByUrl: (root, { data }) => findOrCreateLinkPreviewByUrl(data),

    findOrCreateLocation: (root, { data }) => findOrCreateLocation(data),

    flagInappropriateContent: (root, { data }) =>
      flagInappropriateContent(userId, data),

    fulfillPost: (root, { postId }) => fulfillPost(userId, postId),

    inviteGroupToJoinParent: (root, { parentId, childId }) =>
      inviteGroupToGroup(userId, parentId, childId, GroupRelationshipInvite.TYPE.ParentToChild),

    invitePeopleToEvent: (root, { eventId, inviteeIds }) =>
      invitePeopleToEvent(userId, eventId, inviteeIds),

    leaveGroup: (root, { id }) => leaveGroup(userId, id),

    leaveProject: (root, { id }) => leaveProject(id, userId),

    markActivityRead: (root, { id }) => markActivityRead(userId, id),

    markAllActivitiesRead: (root) => markAllActivitiesRead(userId),

    messageGroupStewards: (root, { groupId }) => messageGroupStewards(userId, groupId),

    pinPost: (root, { postId, groupId }) =>
      pinPost(userId, postId, groupId),

    processStripeToken: (root, { postId, token, amount }) =>
      processStripeToken(userId, postId, token, amount),

    reactOn: (root, { entityId, data }) => reactOn(userId, entityId, data),

    reactivateMe: (root) => reactivateUser({ userId }),

    recordClickthrough: (root, { postId }) => recordClickthrough({ userId, postId }),

    regenerateAccessCode: (root, { groupId }) =>
      regenerateAccessCode(userId, groupId),

    registerDevice: (root, { playerId, platform, version }) =>
      registerDevice(userId, { playerId, platform, version }),

    registerStripeAccount: (root, { authorizationCode }) =>
      registerStripeAccount(userId, authorizationCode),

    reinviteAll: (root, { groupId }) => reinviteAll(userId, groupId),

    rejectGroupRelationshipInvite: (root, { groupRelationshipInviteId }) => rejectGroupRelationshipInvite(userId, groupRelationshipInviteId),

    removeMember: (root, { personId, groupId }) =>
      removeMember(userId, personId, groupId),

    removeModerator: (root, { personId, groupId, isRemoveFromGroup }) =>
      removeModerator(userId, personId, groupId, isRemoveFromGroup),

    removePost: (root, { postId, groupId, slug }) =>
      removePost(userId, postId, groupId || slug),

    removePostFromCollection: (root, { collectionId, postId }) =>
      removePostFromCollection(userId, collectionId, postId),

    removeResponsibilityFromRole: (root, { roleResponsibilityId, groupId }) =>
      removeResponsibilityFromRole({ userId, roleResponsibilityId, groupId }),

    removeRoleFromMember: (root, { roleId, personId, groupId, isCommonRole }) => removeRoleFromMember({ roleId, personId, userId, groupId, isCommonRole }),
    removeProposalVote: (root, { postId, optionId }) => removeProposalVote({ userId, postId, optionId }),

    removeSkill: (root, { id, name }) => removeSkill(userId, id || name),
    removeSkillToLearn: (root, { id, name }) => removeSkillToLearn(userId, id || name),
    removeSuggestedSkillFromGroup: (root, { groupId, id, name }) => removeSuggestedSkillFromGroup(userId, groupId, id || name),

    reorderPostInCollection: (root, { collectionId, postId, newOrderIndex }) =>
      reorderPostInCollection(userId, collectionId, postId, newOrderIndex),

    requestToAddGroupToParent: (root, { parentId, childId, questionAnswers }) =>
      inviteGroupToGroup(userId, childId, parentId, GroupRelationshipInvite.TYPE.ChildToParent, questionAnswers),

    resendInvitation: (root, { invitationId }) =>
      resendInvitation(userId, invitationId),

    respondToEvent: (root, { id, response }) =>
      respondToEvent(userId, id, response),

    setProposalOptions: (root, { postId, options }) => setProposalOptions({ userId, postId, options }),

    subscribe: (root, { groupId, topicId, isSubscribing }) =>
      subscribe(userId, topicId, groupId, isSubscribing),

    swapProposalVote: (root, { postId, removeOptionId, addOptionId }) => swapProposalVote({ userId, postId, removeOptionId, addOptionId }),

    unblockUser: (root, { blockedUserId }) => unblockUser(userId, blockedUserId),

    unfulfillPost: (root, { postId }) => unfulfillPost(userId, postId),

    unlinkAccount: (root, { provider }) =>
      unlinkAccount(userId, provider),

    updateGroupResponsibility: (root, { groupId, responsibilityId, title, description }) =>
      updateGroupResponsibility({ userId, groupId, responsibilityId, title, description }),

    updateGroupRole: (root, { groupRoleId, color, name, description, emoji, active, groupId }) =>
      updateGroupRole({ userId, groupRoleId, color, name, description, emoji, active, groupId }),

    updateGroupSettings: (root, { id, changes }) =>
      updateGroup(userId, id, changes),

    updateGroupTopic: (root, { id, data }) => updateGroupTopic(id, data),

    updateGroupTopicFollow: (root, args) => updateGroupTopicFollow(userId, args),

    updateMe: (root, { changes }) => updateMe(sessionId, userId, changes),

    updateMembership: (root, args) => updateMembership(userId, args),

    updatePost: (root, args) => updatePost(userId, args),

    updateProposalOptions: (root, { postId, options }) => updateProposalOptions({ userId, postId, options }),

    updateProposalOutcome: (root, { postId, proposalOutcome }) => updateProposalOutcome({ userId, postId, proposalOutcome }),

    updateComment: (root, args) => updateComment(userId, args),

    updateStripeAccount: (root, { accountId }) => updateStripeAccount(userId, accountId),

    updateWidget: (root, { id, changes }) => updateWidget(id, changes),

    useInvitation: (root, { invitationToken, accessCode }) =>
      useInvitation(userId, invitationToken, accessCode)
  }
}

export function makeApiQueries (fetchOne, fetchMany) {
  return {
    // you can specify id or slug, but not both
    group: async (root, { id, slug }) => fetchOne('Group', slug || id, slug ? 'slug' : 'id'),

    groups: (root, args) => fetchMany('Group', args),

    // you can query by id or email, with id taking preference
    person: (root, { id, email }) => fetchOne('Person', id || email, id ? 'id' : 'email')
  }
}

export function makeApiMutations () {
  return {
    addMember: (root, { userId, groupId, role }) => addMember(userId, groupId, role),
    createGroup: (root, { asUserId, data }) => createGroup(asUserId, data),
    updateGroup: (root, { asUserId, id, changes }) => updateGroup(asUserId, id, changes)
  }
}

let modelToTypeMap

function getTypeForInstance (instance, models) {
  if (!modelToTypeMap) {
    modelToTypeMap = reduce(models, (m, v, k) => {
      const tableName = v.model.forge().tableName
      if (!m[tableName] || v.isDefaultTypeForTable) {
        m[tableName] = k
      }
      return m
    }, {})
  }

  return modelToTypeMap[instance.tableName]
}

function logError (error) {
  console.error(error.stack)

  return {
    message: error.message,
    locations: error.locations,
    stack: error.stack,
    path: error.path
  }
}
