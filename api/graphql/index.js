import { readFileSync } from 'fs'
import { graphqlHTTP } from 'express-graphql'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'
import {
  acceptGroupRelationshipInvite,
  acceptJoinRequest,
  addModerator,
  addPeopleToProjectRole,
  addSkill,
  addSkillToLearn,
  addSuggestedSkillToGroup,
  allowGroupInvites,
  blockUser,
  cancelGroupRelationshipInvite,
  cancelJoinRequest,
  createAffiliation,
  createComment,
  createGroup,
  createInvitation,
  createJoinRequest,
  createMessage,
  createPost,
  createProject,
  createProjectRole,
  createSavedSearch,
  createTopic,
  deactivateUser,
  deleteUser,
  declineJoinRequest,
  deleteAffiliation,
  deleteComment,
  deleteGroup,
  deleteGroupRelationship,
  deleteGroupTopic,
  deletePost,
  deleteProjectRole,
  deleteSavedSearch,
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
  markActivityRead,
  markAllActivitiesRead,
  pinPost,
  processStripeToken,
  regenerateAccessCode,
  registerDevice,
  registerStripeAccount,
  reinviteAll,
  rejectGroupRelationshipInvite,
  reactivateUser,
  removeMember,
  removeModerator,
  removePost,
  removeSkill,
  removeSkillToLearn,
  removeSuggestedSkillFromGroup,
  resendInvitation,
  respondToEvent,
  subscribe,
  unblockUser,
  unfulfillPost,
  unlinkAccount,
  updateComment,
  updateGroup,
  updateGroupTopic,
  updateGroupTopicFollow,
  updateMe,
  updateMembership,
  updatePost,
  updateStripeAccount,
  updateWidget,
  useInvitation,
  vote
} from './mutations'
import InvitationService from '../services/InvitationService'
import makeModels from './makeModels'
import { makeExecutableSchema } from 'graphql-tools'
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json'
import { inspect } from 'util'
import { red } from 'chalk'
import { merge, reduce } from 'lodash'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()

async function createSchema (session, isAdmin) {
  const userId = session.userId
  const models = await makeModels(userId, isAdmin)
  const { resolvers, fetchOne, fetchMany } = setupBridge(models)

  const allResolvers = Object.assign({
    Query: userId
      ? makeAuthenticatedQueries(userId, fetchOne, fetchMany)
      : makePublicQueries(userId, fetchOne, fetchMany),
    Mutation: userId ? makeMutations(session.id, userId, isAdmin) : {},

    FeedItemContent: {
      __resolveType (data, context, info) {
        if (data instanceof bookshelf.Model) {
          return info.schema.getType('Post')
        }
        throw new Error('Post is the only implemented FeedItemContent type')
      }
    },

    SearchResultContent: {
      __resolveType (data, context, info) {
        return getTypeForInstance(data, models)
      }
    },

    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject
  }, resolvers)

  return makeExecutableSchema({
    typeDefs: [schemaText],
    resolvers: allResolvers
  })
}

// Queries that non-logged in users can make
export function makePublicQueries (userId, fetchOne, fetchMany) {
  return {
    checkInvitation: (root, { invitationToken, accessCode }) =>
      InvitationService.check(userId, invitationToken, accessCode),
    // Can only access public communities and posts
    group: async (root, { id, slug }) => fetchOne('Group', slug || id, slug ? 'slug' : 'id', { visibility: Group.Visibility.PUBLIC }),
    groups: (root, args) => fetchMany('Group', Object.assign(args, { visibility: Group.Visibility.PUBLIC })),
    posts: (root, args) => fetchMany('Post', Object.assign(args, { isPublic: true }))
  }
}

// Queries that logged in users can make
export function makeAuthenticatedQueries (userId, fetchOne, fetchMany) {
  return {
    activity: (root, { id }) => fetchOne('Activity', id),
    checkInvitation: (root, { invitationToken, accessCode }) =>
      InvitationService.check(userId, invitationToken, accessCode),
    comment: (root, { id }) => fetchOne('Comment', id),
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
          if (count > 0) return {exists: true}
          return {exists: false}
        })
      }
      throw new Error('Slug is invalid')
    },
    groupTopic: (root, { topicName, groupSlug }) =>
      GroupTag.findByTagAndGroup(topicName, groupSlug),
    groupTopics: (root, args) => fetchMany('GroupTopic', args),
    groups: (root, args) => fetchMany('Group', args),
    joinRequests: (root, args) => fetchMany('JoinRequest', args),
    me: () => fetchOne('Me', userId),
    messageThread: (root, { id }) => fetchOne('MessageThread', id),
    notifications: (root, { first, offset, resetCount, order = 'desc' }) => {
      return fetchMany('Notification', { first, offset, order })
      .tap(() => resetCount && User.resetNewNotificationCount(userId))
    },
    people: (root, args) => fetchMany('Person', args),
    person: (root, { id }) => fetchOne('Person', id),
    post: (root, { id }) => fetchOne('Post', id),
    posts: (root, args) => fetchMany('Post', args),
    savedSearches: (root, args) => fetchMany('SavedSearch', args),
    search: (root, args) => {
      if (!args.first) args.first = 20
      return Search.fullTextSearch(userId, args)
      .then(({ models, total }) => {
        // FIXME this shouldn't be used directly here -- there should be some
        // way of integrating this into makeModels and using the presentation
        // logic that's already in the fetcher
        return presentQuerySet(models, merge(args, {total}))
      })
    },
    skills: (root, args) => fetchMany('Skill', args),
    topic: (root, { id, name }) => // you can specify id or name, but not both
      fetchOne('Topic', name || id, name ? 'name' : 'id'),
    topics: (root, args) => fetchMany('Topic', args)
  }
}

export function makeMutations (sessionId, userId, isAdmin) {
  return {
    acceptGroupRelationshipInvite: (root, { groupRelationshipInviteId }) => acceptGroupRelationshipInvite(userId, groupRelationshipInviteId),

    acceptJoinRequest: (root, { joinRequestId }) => acceptJoinRequest(userId, joinRequestId),

    addModerator: (root, { personId, groupId }) =>
      addModerator(userId, personId, groupId),

    addPeopleToProjectRole: (root, { peopleIds, projectRoleId }) =>
      addPeopleToProjectRole(userId, peopleIds, projectRoleId),

    addSkill: (root, { name }) => addSkill(userId, name),
    addSkillToLearn: (root, { name }) => addSkillToLearn(userId, name),
    addSuggestedSkillToGroup: (root, { groupId, name }) => addSuggestedSkillToGroup(userId, groupId, name),

    allowGroupInvites: (root, { groupId, data }) => allowGroupInvites(groupId, data),

    blockUser: (root, { blockedUserId }) => blockUser(userId, blockedUserId),

    cancelGroupRelationshipInvite: (root, { groupRelationshipInviteId }) => cancelGroupRelationshipInvite(userId, groupRelationshipInviteId),

    cancelJoinRequest: (root, { joinRequestId }) => cancelJoinRequest(userId, joinRequestId),

    createAffiliation: (root, { data }) => createAffiliation(userId, data),

    createComment: (root, { data }) => createComment(userId, data),

    createGroup: (root, { data }) => createGroup(userId, data),

    createInvitation: (root, {groupId, data}) =>
      createInvitation(userId, groupId, data),

    createJoinRequest: (root, {groupId, questionAnswers}) => createJoinRequest(userId, groupId, questionAnswers),

    createMessage: (root, { data }) => createMessage(userId, data),

    createPost: (root, { data }) => createPost(userId, data),

    createProject: (root, { data }) => createProject(userId, data),

    createProjectRole: (root, { projectId, roleName }) => createProjectRole(userId, projectId, roleName),

    createSavedSearch: (root, { data }) => createSavedSearch(data),

    joinGroup: (root, { groupId }) => joinGroup(groupId, userId),

    joinProject: (root, { id }) => joinProject(id, userId),

    createTopic: (root, { topicName, groupId, isDefault, isSubscribing }) => createTopic(userId, topicName, groupId, isDefault, isSubscribing),

    deactivateMe: (root) => deactivateUser({ sessionId, userId }),

    declineJoinRequest: (root, { joinRequestId }) => declineJoinRequest(userId, joinRequestId),

    deleteAffiliation: (root, { id }) => deleteAffiliation(userId, id),

    deleteComment: (root, { id }) => deleteComment(userId, id),

    deleteGroup: (root, { id }) => deleteGroup(userId, id),

    deleteGroupRelationship: (root, { parentId, childId }) => deleteGroupRelationship(userId, parentId, childId),

    deleteGroupTopic: (root, { id }) => deleteGroupTopic(userId, id),

    deleteMe: (root) => deleteUser({ sessionId, userId }),

    deletePost: (root, { id }) => deletePost(userId, id),

    deleteProjectRole: (root, { id }) => deleteProjectRole(userId, id),

    deleteSavedSearch: (root, { id }) => deleteSavedSearch(id),

    expireInvitation: (root, {invitationId}) =>
      expireInvitation(userId, invitationId),

    findOrCreateThread: (root, { data }) => findOrCreateThread(userId, data),

    findOrCreateLinkPreviewByUrl: (root, { data }) =>
      findOrCreateLinkPreviewByUrl(data),

    findOrCreateLocation: (root, { data }) => findOrCreateLocation(data),

    flagInappropriateContent: (root, { data }) =>
      flagInappropriateContent(userId, data),

    fulfillPost: (root, { postId }) => fulfillPost(userId, postId),

    inviteGroupToJoinParent: (root, { parentId, childId }) =>
      inviteGroupToGroup(userId, parentId, childId, GroupRelationshipInvite.TYPE.ParentToChild),

    invitePeopleToEvent: (root, {eventId, inviteeIds}) =>
      invitePeopleToEvent(userId, eventId, inviteeIds),

    leaveGroup: (root, { id }) => leaveGroup(userId, id),

    leaveProject: (root, { id }) => leaveProject(id, userId),

    markActivityRead: (root, { id }) => markActivityRead(userId, id),

    markAllActivitiesRead: (root) => markAllActivitiesRead(userId),

    pinPost: (root, { postId, groupId }) =>
      pinPost(userId, postId, groupId),

    processStripeToken: (root, { postId, token, amount }) =>
      processStripeToken(userId, postId, token, amount),

    reactivateMe: (root) => reactivateUser({ userId }),

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

    removeSkill: (root, { id, name }) => removeSkill(userId, id || name),
    removeSkillToLearn: (root, { id, name }) => removeSkillToLearn(userId, id || name),
    removeSuggestedSkillFromGroup: (root, { groupId, id, name }) => removeSuggestedSkillFromGroup(userId, groupId, id || name),

    requestToAddGroupToParent: (root, { parentId, childId, questionAnswers }) =>
      inviteGroupToGroup(userId, childId, parentId, GroupRelationshipInvite.TYPE.ChildToParent, questionAnswers),

    resendInvitation: (root, {invitationId}) =>
      resendInvitation(userId, invitationId),

    respondToEvent: (root, {id, response}) =>
      respondToEvent(userId, id, response),

    subscribe: (root, { groupId, topicId, isSubscribing }) =>
      subscribe(userId, topicId, groupId, isSubscribing),

    unblockUser: (root, { blockedUserId }) => unblockUser(userId, blockedUserId),

    unfulfillPost: (root, { postId }) => unfulfillPost(userId, postId),

    unlinkAccount: (root, { provider }) =>
      unlinkAccount(userId, provider),

    updateGroupSettings: (root, { id, changes }) =>
      updateGroup(userId, id, changes),

    updateGroupTopic: (root, { id, data }) => updateGroupTopic(id, data),

    updateGroupTopicFollow: (root, args) => updateGroupTopicFollow(userId, args),

    updateMe: (root, { changes }) => updateMe(sessionId, userId, changes),

    updateMembership: (root, args) => updateMembership(userId, args),

    updatePost: (root, args) => updatePost(userId, args),
    updateComment: (root, args) => updateComment(userId, args),

    updateStripeAccount: (root, { accountId }) => updateStripeAccount(userId, accountId),

    updateWidget: (root, { id, changes }) => updateWidget(id, changes),

    useInvitation: (root, { invitationToken, accessCode }) =>
      useInvitation(userId, invitationToken, accessCode),

    vote: (root, { postId, isUpvote }) => vote(userId, postId, isUpvote)
  }
}

export const createRequestHandler = () =>
  graphqlHTTP(async (req, res) => {
    if (process.env.DEBUG_GRAPHQL) {
      sails.log.info('\n' +
        red('graphql query start') + '\n' +
        req.body.query + '\n' +
        red('graphql query end')
      )
      sails.log.info(inspect(req.body.variables))
    }

    // TODO: since this function can return a promise, we could run through some
    // policies based on the current user here and assign them to context, so
    // that the resolvers can use them to deny or restrict access...
    //
    // ideally we would be able to associate paths with policies, analyze the
    // query to find the policies which should be tested, and run them to allow
    // or deny access to those paths

    if (req.session.userId) {
      await User.query().where({ id: req.session.userId }).update({ last_active_at: new Date() })
    }

    const schema = await createSchema(req.session, Admin.isSignedIn(req))
    return {
      schema,
      graphiql: true,
      customFormatErrorFn: process.env.NODE_ENV === 'development' ? logError : null
    }
  })

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
