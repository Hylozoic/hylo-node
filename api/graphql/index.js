import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import setupBridge from '../../lib/graphql-bookshelf-bridge'
import { updateMe, createPost, findOrCreateThread } from './mutations'
import makeModels from './makeModels'
import { makeExecutableSchema } from 'graphql-tools'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()

function createSchema (userId, isAdmin) {
  const models = makeModels(userId, isAdmin)
  const { resolvers, fetchOne } = setupBridge(models)

  const allResolvers = Object.assign({
    Query: {
      me: () => fetchOne('Me', userId),
      community: (root, { id, slug }) => // you can specify id or slug, but not both
        fetchOne('Community', slug || id, slug ? 'slug' : 'id'),
      person: (root, { id }) => fetchOne('User', id)
    },
    Mutation: {
      updateMe: (root, { changes }) =>
        updateMe(userId, changes).then(() => fetchOne('Me', userId)),
      createPost: (root, { data }) =>
        createPost(userId, data).then(post => fetchOne('Post', post.id)),
      findOrCreateThread: (root, { data }) =>
        findOrCreateThread(userId, data).then(thread => fetchOne('MessageThread', thread.id))
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
    // console.log(req.body.query)
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
