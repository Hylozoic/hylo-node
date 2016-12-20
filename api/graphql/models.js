import DataLoader from 'dataloader'
import { camelCase, curry, forIn, toPairs, transform } from 'lodash'
import { map } from 'lodash/fp'
import uniqueQueryId from './util/uniqueQueryId'

// this defines what subset of attributes and relations in each bookshelf model
// should be exposed through GraphQL.
//
// keys here are table names (except for "me")
const makeSpecs = (userId) => {
  // TODO: cache this?
  const myCommunityIds = () =>
    Membership.query().select('community_id')
    .where({user_id: userId, active: true})

  return {
    me: { // the root of the graph
      model: User,
      attributes: ['id', 'name', 'avatar_url'],
      relations: ['communities', 'posts']
    },

    users: {
      model: User,
      attributes: ['id', 'name', 'avatar_url'],
      relations: ['posts'],
      filter: relation => relation.query(q => {
        q.where('users.id', 'in', Membership.query().select('user_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    posts: {
      model: Post,
      attributes: ['id', 'created_at'],
      getters: {
        title: p => p.get('name'),
        details: p => p.get('description')
      },
      relations: ['communities', 'followers'],
      filter: relation => relation.query(q => {
        q.where('posts.id', 'in', PostMembership.query().select('post_id')
          .where('community_id', 'in', myCommunityIds()))
      })
    },

    communities: {
      model: Community,
      attributes: ['id', 'name', 'created_at'],
      getters: {
        popularSkills: (c, { first }) => c.popularSkills(first)
      },
      relations: [{members: 'users'}],
      filter: relation => relation.query(q => {
        q.where('communities.id', 'in', myCommunityIds())
      })
    }
  }
}

export function createModels (schema, userId) {
  const specs = makeSpecs(userId)
  const loaders = {}

  forIn(specs, ({ model }, name) => {
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
    queries => Promise.map(queries, q => q.fetch()),
    {cacheKeyFn: uniqueQueryId}
  )

  const fetchRelation = (relation, paginationOpts) => {
    const { targetTableName, type, parentFk } = relation.relatedData
    const loader = loaders[targetTableName]

    if (type === 'belongsTo') {
      return loader.load(parentFk)
    }

    const relationSpec = specs[targetTableName]
    if (relationSpec.filter) relation = relationSpec.filter(relation)

    return queryLoader.load(relation.query(q => {
      applyPagination(q, paginationOpts)
    }))
    .then(instances => {
      // N.B. this caching doesn't take into account data added by withPivot
      instances.each(x => loader.prime(x.id, x))
      return loader.loadMany(instances.map('id'))
      .then(map(format(targetTableName)))
    })
  }

  const fetchOne = (tableName, id) => {
    const { model, filter } = specs[tableName]
    const query = filter(model.where('id', id))
    return queryLoader.load(query).then(instance => {
      if (!instance) return
      loaders[tableName].prime(instance.id, instance)
      return format(tableName, instance)
    })
  }

  const format = curry((name, instance) => {
    const { model, attributes, getters, relations } = specs[name]
    const tableName = model.collection().tableName()
    if (instance.tableName !== tableName) {
      throw new Error(`table names don't match: "${instance.tableName}", "${tableName}"`)
    }

    const formatted = Object.assign(
      transform(attributes, (result, attr) => {
        result[camelCase(attr)] = instance.get(attr)
      }, {}),

      transform(getters, (result, fn, attr) => {
        result[attr] = args => fn(instance, args)
      }, {}),

      transform(relations, (result, attr) => {
        const [ graphqlName, bookshelfName ] = typeof attr === 'string'
          ? [attr, attr] : toPairs(attr)[0]

        result[graphqlName] = ({ first, cursor, order }) => {
          const relation = instance[bookshelfName]()
          return fetchRelation(relation, {first, cursor, order})
        }
      }, {})
    )

    return formatted
  })

  return {
    me: () => {
      if (!userId) return {id: 'Not logged in', name: 'Not logged in'}
      return loaders.users.load(userId).then(format('me'))
    },

    community: id => fetchOne('communities', id)
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
