import { buildSchema } from 'graphql'
import { readFileSync } from 'fs'
import graphqlHTTP from 'express-graphql'
import { join } from 'path'
import Fetcher from './fetcher'
import models from './models'
import { updateMe, createPost } from './mutations'

const schemaText = readFileSync(join(__dirname, 'schema.graphql')).toString()
const schema = buildSchema(schemaText)

const createRootValue = (userId, isAdmin) => {
  if (!userId) {
    return {
      me: null
    }
  }

  const fetcher = new Fetcher(models(userId, isAdmin))

  return {
    me: () => fetcher.fetchOne('me', userId),
    community: ({ id, slug }) => // you can specify id or slug, but not both
      fetcher.fetchOne('communities', slug || id, slug ? 'slug' : 'id'),
    person: ({ id }) => fetcher.fetchOne('users', id),

    updateMe: ({ changes }) =>
      updateMe(userId, changes).then(() => fetcher.fetchOne('me', userId)),
    createPost: ({ data }) =>
      createPost(userId, data).then(post => fetcher.fetchOne('posts', post.id))
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
      rootValue: createRootValue(req.session.userId, Admin.isSignedIn(req)),
      graphiql: true
    }
  })
