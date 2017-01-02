import { buildSchema } from 'graphql'
import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import Fetcher from './fetcher'
import models from './models'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()
const schema = buildSchema(schemaText)

const createRootValue = userId => {
  if (!userId) {
    return {
      me: null
    }
  }

  const fetcher = new Fetcher(models(userId))

  return {
    me: () => fetcher.fetchOne('me', userId),
    community: ({ id, slug }) => // you can specify id or slug, but not both
      fetcher.fetchOne('communities', slug || id, slug ? 'slug' : 'id'),
    person: ({ id }) => fetcher.fetchOne('users', id)
  }
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
      schema,
      rootValue: createRootValue(req.session.userId),
      graphiql: true
    }
  })
