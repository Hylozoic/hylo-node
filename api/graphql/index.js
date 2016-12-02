import { buildSchema } from 'graphql'
import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import createLoaders from './createLoaders'

const rootValue = {
  me: (args, { req, loaders }) => loaders.users.load(req.session.userId)
}

const schemaText = readFileSync(__dirname + '/schema.graphql').toString()
const schema = buildSchema(schemaText)

export const createRequestHandler = () =>
  graphqlHTTP((req, res) => {
    // TODO: this function can return a promise -- maybe run through some
    // policies based on the current user here and assign them to context, so
    // that the resolvers can use them to deny or restrict access?
    return {
      schema,
      rootValue,
      graphiql: true,
      context: {req, loaders: createLoaders(req.session.userId)}
    }
  })
