import DataLoader from 'dataloader'
import { forIn, pick, toPairs, transform } from 'lodash'
import { map, omitBy } from 'lodash/fp'
import { inspect } from 'util'

// a means of identifying duplicate Bookshelf queries. ideally we would compare
// the final SQL query text, but this is surprisingly difficult to find for some
// types of Bookshelf relations. so this is a hacked-together workaround.
const uniqueQueryID = query => {
  const signature = omitBy(x => !x, pick(query.relatedData, [
    'parentTableName', 'parentId', 'parentFk',
    'joinTableName', 'foreignKey', 'otherKey',
    'targetTableName', 'type'
  ]))
  return inspect(signature) + inspect(pick(query._knex.toSQL(), 'sql', 'bindings'))
}

// this defines what subset of attributes and relations in each bookshelf model
// should be exposed through GraphQL.
//
// keys here are table names (except for "me")
const makeSpecs = () => ({
  me: {
    model: User,
    attributes: ['id', 'name', 'avatar_url'],
    relations: ['communities', 'posts']
  },

  users: {
    model: User,
    attributes: ['id', 'name', 'avatar_url'],
    relations: ['posts']
  },

  posts: {
    model: Post,
    attributes: ['id'],
    getters: {
      title: p => p.get('name'),
      details: p => p.get('description')
    },
    relations: ['communities', 'followers']
  },

  communities: {
    model: Community,
    attributes: ['id', 'name'],
    relations: [{members: 'users'}]
  }
})

export function createModels (schema, userId) {
  const specs = makeSpecs()
  const loaders = {}

  forIn(specs, ({ model, attributes, getters, relations }, name) => {
    loaders[name] = new DataLoader(ids => {
      return model.where('id', 'in', ids).fetchAll()
      .then(objects =>
        // ensure that the order of objects matches the order of ids
        ids.map(id => objects.find(x => x.id === id)))
    })
  })

  // general-purpose query cache, for relational SQL queries that aren't just
  // fetching objects by ID.
  const queryLoader = new DataLoader(
    queries => Promise.map(queries, q =>
      q.fetch().tap(instances => {
        // N.B. this caching doesn't take into account data added by withPivot
        const { targetTableName } = q.relatedData
        const loader = loaders[targetTableName]
        instances.each(x => loader.prime(x.id, x))
      })),
    {
      cacheKeyFn: uniqueQueryID
    }
  )

  const fetchRelation = (relation, paginationOpts) => {
    const { targetTableName, type, parentFk } = relation.relatedData
    const loader = loaders[targetTableName]

    if (type === 'belongsTo') {
      return loader.load(parentFk)
    }

    return queryLoader.load(relation.query(q => {
      applyPagination(q, paginationOpts)
    }))
    .then(instances => {
      instances.each(x => loader.prime(x.id, x))
      return loader.loadMany(instances.map('id'))
      .then(map(format(targetTableName)))
    })
  }

  const format = name => instance => {
    const { model, attributes, getters, relations } = specs[name]
    const tableName = model.collection().tableName()
    if (instance.tableName !== tableName) {
      throw new Error(`table names don't match: "${instance.tableName}", "${tableName}"`)
    }

    const formatted = Object.assign(
      attributes ? instance.pick(attributes) : {},

      transform(attributes, (result, attr) => {
        result[attr] = instance.get(attr)
      }, {}),

      transform(getters, (result, fn, attr) => {
        result[attr] = () => fn(instance)
      }, {}),

      transform(relations, (result, attr) => {
        let graphqlName, bookshelfName
        if (typeof attr === 'string') {
          ;[ graphqlName, bookshelfName ] = [attr, attr]
        } else {
          ;[ graphqlName, bookshelfName ] = toPairs(attr)[0]
        }
        result[graphqlName] = ({ first, cursor, order }) => {
          const relation = instance[bookshelfName]()
          return fetchRelation(relation, {first, cursor, order})
        }
      }, {})
    )

    return formatted
  }

  const restrictions = {
    // TODO: restrict based on policies for userId
  }

  return {
    fetchMe: () =>
      loaders.users.load(userId)
      .then(format('me'))
  }
}

const applyPagination = (query, { first, cursor, order, column = 'id' }) => {
  query = query.orderBy(column, order)
  if (first) query = query.limit(first)
  if (cursor) {
    const op = order === 'asc' ? '>' : '<'
    query = query.where(column, op, cursor)
  }
  return query
}
