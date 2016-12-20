import { buildSchema } from 'graphql'
import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { createModels } from './models'
import { join } from 'path'

const rootValue = {
  me: (args, { req, models }) => models.me(),
  community: (args, { req, models }) => models.community(args.id)
}

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()
const schema = buildSchema(schemaText)

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
      schema,
      rootValue,
      graphiql: true,
      context: {req, models: createModels(schema, req.session.userId)}
    }
  })
