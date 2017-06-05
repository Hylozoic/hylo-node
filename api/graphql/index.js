import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import {
  createComment,
  createPost,
  updatePost,
  findOrCreateThread,
  leaveCommunity,
  markActivityRead,
  markAllActivitiesRead,
  subscribe,
  updateCommunitySettings,
  updateCommunityTopic,
  updateMe,
  updateMembership,
  unlinkAccount,
  vote,
  addModerator,
  removeModerator,
  deletePost
} from './mutations'
import makeModels from './makeModels'
import { makeExecutableSchema } from 'graphql-tools'
import { inspect } from 'util'
import { red } from 'chalk'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()

function createSchema (userId, isAdmin) {
  const models = makeModels(userId, isAdmin)
  const { resolvers, fetchOne, fetchMany } = setupBridge(models)

  const allResolvers = Object.assign({
    Query: {
      me: () => fetchOne('Me', userId),
      community: (root, { id, slug }) => // you can specify id or slug, but not both
        fetchOne('Community', slug || id, slug ? 'slug' : 'id'),
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
        CommunityTag.findByTagAndCommunity(topicName, communitySlug)
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
      leaveCommunity: (root, { id }) => leaveCommunity(userId, id),
      markActivityRead: (root, { id }) => markActivityRead(userId, id),
      markAllActivitiesRead: (root) => markAllActivitiesRead(userId),
      subscribe: (root, { communityId, topicId, isSubscribing }) =>
        subscribe(userId, topicId, communityId, isSubscribing),
      updateCommunitySettings: (root, { id, changes }) =>
        updateCommunitySettings(userId, id, changes),
      updateCommunityTopic: (root, args) => updateCommunityTopic(userId, args),
      updateMembership: (root, args) => updateMembership(userId, args),
      unlinkAccount: (root, { provider }) => unlinkAccount(userId, provider),
      vote: (root, { postId, isUpvote }) => vote(userId, postId, isUpvote),
      addModerator: (root, { personId, communityId }) =>
        addModerator(userId, personId, communityId),
      removeModerator: (root, { personId, communityId }) =>
        removeModerator(userId, personId, communityId),
      deletePost: (root, { id }) =>
        deletePost(userId, id)
    },

    FeedItemContent: {
      __resolveType (data, context, info) {
        if (data instanceof bookshelf.Model) {
          return info.schema.getType('Post')
        }
        throw new Error('Post is the only implemented FeedItemContent type')
      }
    }
  }, resolvers)

  return makeExecutableSchema({
    typeDefs: [schemaText],
    resolvers: allResolvers
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
