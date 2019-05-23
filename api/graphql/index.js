import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'
import {
  addCommunityToNetwork,
  addModerator,
  addNetworkModeratorRole,
  addPeopleToProjectRole,
  addSkill,
  allowCommunityInvites,
  blockUser,
  createComment,
  createCommunity,
  createInvitation,
  createMessage,
  createPost,
  createProject,
  createProjectRole,
  createTopic,
  deleteComment,
  deleteCommunity,
  deleteCommunityTopic,
  deletePost,
  deleteProjectRole,
  expireInvitation,
  findOrCreateLinkPreviewByUrl,
  findOrCreateThread,
  flagInappropriateContent,
  invitePeopleToEvent,
  joinProject,
  leaveCommunity,
  leaveProject,
  markActivityRead,
  markAllActivitiesRead,
  pinPost,
  processStripeToken,
  regenerateAccessCode,
  registerDevice,
  registerStripeAccount,
  reinviteAll,
  removeCommunityFromNetwork,
  removeMember,
  removeModerator,
  removeNetworkModeratorRole,
  removePost,
  removeSkill,
  resendInvitation,
  respondToEvent,
  subscribe,
  unblockUser,
  unlinkAccount,
  updateComment,
  updateCommunity,
  updateCommunityHiddenSetting,
  updateCommunityTopic,
  updateMe,
  updateMembership,
  updateNetwork,
  updatePost,
  updateStripeAccount,
  useInvitation,
  vote
} from './mutations'
import InvitationService from '../services/InvitationService'
import makeModels from './makeModels'
import { makeExecutableSchema } from 'graphql-tools'
import { inspect } from 'util'
import { red } from 'chalk'
import { mapValues, merge, reduce } from 'lodash'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()

async function createSchema (userId, isAdmin) {
  const models = await makeModels(userId, isAdmin)
  const { resolvers, fetchOne, fetchMany } = setupBridge(models)

  const allResolvers = Object.assign({
    Query: makeQueries(userId, fetchOne, fetchMany),
    Mutation: makeMutations(userId, isAdmin),

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
    }
  }, resolvers)

  return makeExecutableSchema({
    typeDefs: [schemaText],
    resolvers: requireUser(allResolvers, userId)
  })
}

export function makeQueries (userId, fetchOne, fetchMany) {
  return {
    activity: (root, { id }) => fetchOne('Activity', id),
    me: () => fetchOne('Me', userId),
    community: async (root, { id, slug, updateLastViewed }) => {
      // you can specify id or slug, but not both
      const response = await fetchOne('Community', slug || id, slug ? 'slug' : 'id')
      if (updateLastViewed) {
        const community = await Community.find(id || slug)
        if (community) {
          const membership = await GroupMembership.forPair(userId, community).fetch()
          if (membership) {
            await membership.addSetting({lastReadAt: new Date()}, true)
          }
        }
      }
      return response
    },
    communityExists: (root, { slug }) => {
      if (Community.isSlugValid(slug)) {
        return Community.where(bookshelf.knex.raw('slug = ?', slug))
        .count()
        .then(count => {
          if (count > 0) return {exists: true}
          return {exists: false}
        })
      }
      throw new Error('Slug is invalid')
    },
    communities: (root, args) => fetchMany('Community', args),
    notifications: (root, { first, offset, resetCount, order = 'desc' }) => {
      return fetchMany('Notification', { first, offset, order })
      .tap(() => resetCount && User.resetNewNotificationCount(userId))
    },
    person: (root, { id }) => fetchOne('Person', id),
    messageThread: (root, { id }) => fetchOne('MessageThread', id),
    post: (root, { id }) => fetchOne('Post', id),
    posts: (root, args) => fetchMany('Post', args),
    people: (root, args) => fetchMany('Person', args),
    topics: (root, args) => fetchMany('Topic', args),
    connections: (root, args) => fetchMany('PersonConnection', args),
    communityTopics: (root, args) => fetchMany('CommunityTopic', args),
    topic: (root, { id, name }) => // you can specify id or name, but not both
      fetchOne('Topic', name || id, name ? 'name' : 'id'),
    communityTopic: (root, { topicName, communitySlug }) =>
      CommunityTag.findByTagAndCommunity(topicName, communitySlug),
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
    network: (root, { id, slug }) =>  // you can specify id or slug, but not both
      fetchOne('Network', slug || id, slug ? 'slug' : 'id'),
    skills: (root, args) => fetchMany('Skill', args),
    checkInvitation: (root, { invitationToken, accessCode }) =>
      InvitationService.check(userId, invitationToken, accessCode)
  }
}

export function makeMutations (userId, isAdmin) {
  return {
    addCommunityToNetwork: (root, { communityId, networkId }) =>
      addCommunityToNetwork({ userId, isAdmin }, { communityId, networkId }),

    addModerator: (root, { personId, communityId }) =>
      addModerator(userId, personId, communityId),

    addNetworkModeratorRole: (root, { personId, networkId }) =>
      addNetworkModeratorRole({ userId, isAdmin }, { personId, networkId }),

    addPeopleToProjectRole: (root, { peopleIds, projectRoleId }) =>
      addPeopleToProjectRole(userId, peopleIds, projectRoleId),

    addSkill: (root, { name }) => addSkill(userId, name),

    allowCommunityInvites: (root, { communityId, data }) => allowCommunityInvites(communityId, data),

    blockUser: (root, { blockedUserId }) => blockUser(userId, blockedUserId),

    createComment: (root, { data }) => createComment(userId, data),

    createCommunity: (root, { data }) => createCommunity(userId, data),

    createInvitation: (root, {communityId, data}) =>
      createInvitation(userId, communityId, data),

    createMessage: (root, { data }) => createMessage(userId, data),

    createPost: (root, { data }) => createPost(userId, data),

    createProject: (root, { data }) => createProject(userId, data),

    createProjectRole: (root, { projectId, roleName }) => createProjectRole(userId, projectId, roleName),

    joinProject: (root, { id }) => joinProject(id, userId),

    createTopic: (root, { topicName, communityId }) => createTopic(userId, topicName, communityId),

    deleteComment: (root, { id }) => deleteComment(userId, id),

    deleteCommunity: (root, { id }) => deleteCommunity(userId, id),

    deleteCommunityTopic: (root, { id }) => deleteCommunityTopic(userId, id),

    deletePost: (root, { id }) => deletePost(userId, id),

    deleteProjectRole: (root, { id }) => deleteProjectRole(userId, id),

    expireInvitation: (root, {invitationId}) =>
      expireInvitation(userId, invitationId),

    findOrCreateThread: (root, { data }) => findOrCreateThread(userId, data),

    findOrCreateLinkPreviewByUrl: (root, { data }) =>
      findOrCreateLinkPreviewByUrl(data),

    flagInappropriateContent: (root, { data }) =>
      flagInappropriateContent(userId, data),
    
    invitePeopleToEvent: (root, {eventId, inviteeIds}) =>
      invitePeopleToEvent(userId, eventId, inviteeIds),

    leaveCommunity: (root, { id }) => leaveCommunity(userId, id),

    leaveProject: (root, { id }) => leaveProject(id, userId),

    markActivityRead: (root, { id }) => markActivityRead(userId, id),

    markAllActivitiesRead: (root) => markAllActivitiesRead(userId),

    pinPost: (root, { postId, communityId }) =>
      pinPost(userId, postId, communityId),
      
    processStripeToken: (root, { postId, token, amount }) =>
      processStripeToken(userId, postId, token, amount),
      
    regenerateAccessCode: (root, { communityId }) =>
      regenerateAccessCode(userId, communityId),

    registerDevice: (root, { playerId, platform, version }) =>
      registerDevice(userId, { playerId, platform, version }),

    registerStripeAccount: (root, { authorizationCode }) =>
      registerStripeAccount(userId, authorizationCode),

    reinviteAll: (root, {communityId}) => reinviteAll(userId, communityId),

    removeCommunityFromNetwork: (root, { communityId, networkId }) =>
      removeCommunityFromNetwork({ userId, isAdmin }, { communityId, networkId }),

    removeMember: (root, { personId, communityId }) =>
      removeMember(userId, personId, communityId),

    removeModerator: (root, { personId, communityId, isRemoveFromCommunity }) =>
      removeModerator(userId, personId, communityId, isRemoveFromCommunity),

    removeNetworkModeratorRole: (root, { personId, networkId }) =>
      removeNetworkModeratorRole({ userId, isAdmin }, { personId, networkId }),

    removePost: (root, { postId, communityId, slug }) =>
      removePost(userId, postId, communityId || slug),

    removeSkill: (root, { id, name }) => removeSkill(userId, id || name),

    resendInvitation: (root, {invitationId}) =>
      resendInvitation(userId, invitationId),

    respondToEvent: (root, {id, response}) =>
      respondToEvent(userId, id, response),

    subscribe: (root, { communityId, topicId, isSubscribing }) =>
      subscribe(userId, topicId, communityId, isSubscribing),

    unblockUser: (root, { blockedUserId }) => unblockUser(userId, blockedUserId),

    unlinkAccount: (root, { provider }) =>
      unlinkAccount(userId, provider),

    updateCommunitySettings: (root, { id, changes }) =>
      updateCommunity(userId, id, changes),

    updateCommunityHiddenSetting: (root, { id, hidden }) =>
      updateCommunityHiddenSetting({ userId, isAdmin }, id, hidden),

    updateCommunityTopic: (root, args) => updateCommunityTopic(userId, args),

    updateMe: (root, { changes }) => updateMe(userId, changes),

    updateMembership: (root, args) => updateMembership(userId, args),

    updateNetwork: (root, args) => updateNetwork({ userId, isAdmin }, args),

    updatePost: (root, args) => updatePost(userId, args),
    updateComment: (root, args) => updateComment(userId, args),

    updateStripeAccount: (root, { accountId }) => updateStripeAccount(userId, accountId),

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

    const schema = await createSchema(req.session.userId, Admin.isSignedIn(req))
    return {
      schema,
      graphiql: true,
      formatError: process.env.NODE_ENV === 'development' ? logError : null
    }
  })

function requireUser (resolvers, userId) {
  if (userId) return resolvers

  const error = () => {
    throw new Error('not logged in')
  }

  return Object.assign({}, resolvers, {
    Query: mapValues(resolvers.Query, (v, k) => {
      if (k === 'checkInvitation') return v
      return error
    }),
    Mutation: mapValues(resolvers.Mutation, () => error)
  })
}

var modelToTypeMap

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
