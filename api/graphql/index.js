import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import Fetcher from './fetcher'
import makeModels from './makeModels'
import makeResolvers from './makeResolvers'
import { makeExecutableSchema } from 'graphql-tools'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()

function createSchema (userId, isAdmin) {
  const models = makeModels(userId, isAdmin)
  const fetcher = new Fetcher(models)

  const resolvers = Object.assign({
    Query: {
      me: () => fetcher.fetchOne('me', userId),
      community: (root, { id, slug }) => // you can specify id or slug, but not both
        fetcher.fetchOne('communities', slug || id, slug ? 'slug' : 'id'),
      person: (root, { id }) => fetcher.fetchOne('users', id)
    },
    Mutation: {
      updateMe: (root, { changes }) => {
        return User.find(userId)
        .then(user => user.validateAndSave(changes))
        .then(() => fetcher.fetchOne('me', userId))
      }
    },

    FeedItemContent: {
      __resolveType (data, context, info) {
        if (data instanceof bookshelf.Model) {
          return info.schema.getType('Post')
        }
        throw new Error('Post is the only implemented FeedItemContent type')
      }
    }
  }, makeResolvers(models, fetcher))

  return makeExecutableSchema({typeDefs: [schemaText], resolvers})
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
