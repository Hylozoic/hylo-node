import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import { presentQuerySet } from '../../lib/graphql-bookshelf-bridge/util'
import {
  createComment,
  createPost,
  updatePost,
  findOrCreateThread,
  findOrCreateLinkPreviewByUrl,
  leaveCommunity,
  markActivityRead,
  markAllActivitiesRead,
  subscribe,
  updateCommunitySettings,
  updateCommunityTopic,
  updateMe,
  updateMembership,
  updateNetwork,
  unlinkAccount,
  vote,
  addModerator,
  removeModerator,
  deletePost,
  addSkill,
  removeSkill,
  removeMember,
  regenerateAccessCode,
  createInvitation,
  expireInvitation,
  resendInvitation,
  reinviteAll,
  flagInappropriateContent,
  removePost,
  createCommunity,
  deleteComment
} from './mutations'
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
    Query: {
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
        return Search.forCommunities({ slug }).fetch().then(result => {
          if (result) return {exists: true}
          return {exists: false}
        })
      },
      notifications: (root, { first, offset, resetCount, order = 'desc' }) => {
        return fetchMany('Notification', { first, offset, order })
        .tap(() => {
          if (resetCount) {
            return User.query()
            .where('id', userId)
            .update({new_notification_count: 0})
          }
        })
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
      search: (root, args) =>
        Search.fullTextSearch(userId, args)
        .then(({ models, total }) => {
          return presentQuerySet(models, merge(args, {total}))
        }),
      network: (root, { id, slug }) =>  // you can specify id or slug, but not both
        fetchOne('Network', slug || id, slug ? 'slug' : 'id'),
      skills: (root, args) => fetchMany('Skill', args)
    },
    Mutation: {
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
        updateCommunitySettings(userId, id, changes),
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
      removeSkill: (root, { id }) => removeSkill(userId, id),
      removeMember: (root, { personId, communityId }) => removeMember(userId, personId, communityId),
      regenerateAccessCode: (root, { communityId }) => regenerateAccessCode(userId, communityId),
      createInvitation: (root, {communityId, data}) => createInvitation(userId, communityId, data),
      expireInvitation: (root, {invitationId}) => expireInvitation(userId, invitationId),
      resendInvitation: (root, {invitationId}) => resendInvitation(userId, invitationId),
      reinviteAll: (root, {communityId}) => reinviteAll(userId, communityId),
      flagInappropriateContent: (root, { data }) => flagInappropriateContent(userId, data),
      removePost: (root, { postId, communityId, slug }) => removePost(userId, postId, communityId || slug),
      createCommunity: (root, { data }) => createCommunity(userId, data),
      deleteComment: (root, { id }) => deleteComment(userId, id)
    },

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
      graphiql: true
    }
  })

function requireUser (resolvers, userId) {
  if (userId) return resolvers

  const error = () => {
    throw new Error('not logged in')
  }

  return Object.assign({}, resolvers, {
    Query: mapValues(resolvers.Query, () => error),
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
