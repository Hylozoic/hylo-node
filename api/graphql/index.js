import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'
import {
  addModerator,
  addSkill,
  createComment,
  createCommunity,
  createInvitation,
  createPost,
  deleteComment,
  deletePost,
  expireInvitation,
  findOrCreateLinkPreviewByUrl,
  findOrCreateThread,
  flagInappropriateContent,
  leaveCommunity,
  markActivityRead,
  markAllActivitiesRead,
  regenerateAccessCode,
  reinviteAll,
  removeMember,
  removeModerator,
  removePost,
  removeSkill,
  resendInvitation,
  subscribe,
  unlinkAccount,
  updateCommunity,
  updateCommunityTopic,
  updateMe,
  updateMembership,
  updateNetwork,
  updatePost,
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

function createSchema (userId, isAdmin) {
  const models = makeModels(userId, isAdmin)
  const { resolvers, fetchOne, fetchMany } = setupBridge(models)

  const allResolvers = Object.assign({
    Query: makeQueries(userId, fetchOne, fetchMany),
    Mutation: makeMutations(userId),

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
    me: () => fetchOne('Me', userId),
    community: (root, { id, slug, updateLastViewed }) => { // you can specify id or slug, but not both
      return fetchOne('Community', slug || id, slug ? 'slug' : 'id')
        .tap(community => {
          if (community && updateLastViewed) {
            return Membership.updateLastViewedAt(userId, community.id)
          }
        })
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

export function makeMutations (userId) {
  return {
    updateMe: (root, { changes }) => updateMe(userId, changes),
    createPost: (root, { data }) => createPost(userId, data),
    updatePost: (root, args) => updatePost(userId, args),
    createComment: (root, { data }) => createComment(userId, data),
    createMessage: (root, { data }) => {
      data.postId = data.messageThreadId
      return createComment(userId, data)
    },
    findOrCreateThread: (root, { data }) => findOrCreateThread(userId, data),
    findOrCreateLinkPreviewByUrl: (root, { data }) => findOrCreateLinkPreviewByUrl(data),
    leaveCommunity: (root, { id }) => leaveCommunity(userId, id),
    markActivityRead: (root, { id }) => markActivityRead(userId, id),
    markAllActivitiesRead: (root) => markAllActivitiesRead(userId),
    subscribe: (root, { communityId, topicId, isSubscribing }) =>
      subscribe(userId, topicId, communityId, isSubscribing),
    updateCommunitySettings: (root, { id, changes }) =>
      updateCommunity(userId, id, changes),
    updateCommunityTopic: (root, args) => updateCommunityTopic(userId, args),
    updateMembership: (root, args) => updateMembership(userId, args),
    updateNetwork: (root, args) => updateNetwork(userId, args),
    unlinkAccount: (root, { provider }) => unlinkAccount(userId, provider),
    vote: (root, { postId, isUpvote }) => vote(userId, postId, isUpvote),
    addModerator: (root, { personId, communityId }) =>
      addModerator(userId, personId, communityId),
    removeModerator: (root, { personId, communityId }) =>
      removeModerator(userId, personId, communityId),
    deletePost: (root, { id }) =>
      deletePost(userId, id),
    addSkill: (root, { name }) => addSkill(userId, name),
    removeSkill: (root, { id, name }) => removeSkill(userId, id || name),
    removeMember: (root, { personId, communityId }) => removeMember(userId, personId, communityId),
    regenerateAccessCode: (root, { communityId }) => regenerateAccessCode(userId, communityId),
    createInvitation: (root, {communityId, data}) => createInvitation(userId, communityId, data),
    expireInvitation: (root, {invitationId}) => expireInvitation(userId, invitationId),
    resendInvitation: (root, {invitationId}) => resendInvitation(userId, invitationId),
    reinviteAll: (root, {communityId}) => reinviteAll(userId, communityId),
    useInvitation: (root, { invitationToken, accessCode }) => useInvitation(userId, invitationToken, accessCode),
    flagInappropriateContent: (root, { data }) => flagInappropriateContent(userId, data),
    removePost: (root, { postId, communityId, slug }) => removePost(userId, postId, communityId || slug),
    createCommunity: (root, { data }) => createCommunity(userId, data),
    deleteComment: (root, { id }) => deleteComment(userId, id)
  }
}

export const createRequestHandler = () =>
  graphqlHTTP((req, res) => {
    sails.log.info('\n' +
      red('graphql query start') + '\n' +
      req.body.query + '\n' +
      red('graphql query end')
    )
    sails.log.info(inspect(req.body.variables))
    // TODO: this function can return a promise -- maybe run through some
    // policies based on the current user here and assign them to context, so
    // that the resolvers can use them to deny or restrict access?
    //
    // ideally we would be able to associate paths with policies, analyze the
    // query to find the policies which should be tested, and run them to allow
    // or deny access to those paths
    return {
      schema: createSchema(req.session.userId, Admin.isSignedIn(req)),
      graphiql: true,
      formatError: process.env.NODE_ENV === 'development' ? error => ({
        message: error.message,
        locations: error.locations,
        stack: error.stack,
        path: error.path
      }) : null
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
