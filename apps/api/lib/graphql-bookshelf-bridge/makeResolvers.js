import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { camelCase, partialRight, pick, toPairs, transform } from 'lodash'
import { get } from 'lodash/fp'
import EventEmitter from 'events'
import { PAGINATION_TOTAL_COLUMN_NAME } from './util/applyPagination'
import GraphQLJSON from 'graphql-type-json';

export default function makeResolvers (models, fetcher) {
  return transform(models, (result, spec, typename) => {
    result[typename] = createResolverForModel(spec, fetcher)
  }, {
    // Add a Date type
    Date: new GraphQLScalarType({
      name: 'Date',
      description: 'Date custom scalar type',
      parseValue (value) {
        return new Date(value) // value from the client
      },
      serialize (value) {
        return value ? (value.toISOString ? value.toISOString() : value) : null
      },
      parseLiteral (ast) {
        if (ast.kind === Kind.INT) {
          return new Date(+ast.value) // ast value is always in string format
        } else if (ast.kind === Kind.STRING) {
          return new Date(ast.value)
        }
        return null
      }
    }),
    JSON: GraphQLJSON
  })
}

export function createResolverForModel (spec, fetcher) {
  const { attributes, getters, relations, model } = spec

  return Object.assign(
    transform(attributes, resolveAttribute, {}),

    transform(getters, (result, fn, attr) => {
      result[attr] = fn
    }, {}),

    transform(relations, (result, attr) => {
      var graphqlName, bookshelfName, typename
      var opts = {}

      if (typeof attr === 'string') {
        graphqlName = attr
        bookshelfName = attr
      } else {
        [ bookshelfName, opts ] = toPairs(attr)[0]

        // relations can be aliased: in your model definition, you can write
        // e.g. `relations: [{users: {alias: 'members'}}]` to map `members` in
        // your GraphQL schema to the `users` Bookshelf relation.
        graphqlName = opts.alias || bookshelfName

        // this must be set when a relation's Bookshelf model is backing more
        // than one GraphQL schema type.
        typename = opts.typename
      }

      let hasTotal
      try {
        hasTotal = !opts.querySet &&
        !['belongsTo', 'hasOne'].includes(
          get('type', model.forge()[bookshelfName]().relatedData))
      } catch (err) {
        throw new Error(`Couldn't find relation "${bookshelfName}" on ${model.forge().tableName}`)
      }

      const emitterName = `__${graphqlName}__total_emitter`

      result[graphqlName] = async (instance, args) => {
        const fetchOpts = Object.assign(
          {
            querySet: opts.querySet,
            filter: opts.filter && partialRight(opts.filter, args)
          },
          pick(args, 'first', 'cursor', 'order', 'sortBy', 'offset')
        )

        if (hasTotal) instance[emitterName] = new EventEmitter()

        // opts.arguments can be used to pass selected arguments from the
        // GraphQL query to a relation method. opts.arguments can be a function
        // that takes the hash of named arguments from a GraphQL query item and
        // returns an array of arguments to pass to a relation method.
        //
        // e.g.:
        //
        // in query:
        //   drinks(size: "large", sugarContent: "low")
        //
        // in relations definition:
        //   drinks: {
        //     arguments: ({ size, sugarContent }) => [sugarContent, size]
        //   }
        //
        // in model:
        //   drinks: function (sugarContent, size) { ... }
        //
        const relation = opts.arguments
          ? instance[bookshelfName].apply(instance, opts.arguments(args))
          : instance[bookshelfName]()

        const callback = hasTotal && (instances => {
          if (!hasTotal) return
          const total = instances.length > 0
            ? instances.first().get(PAGINATION_TOTAL_COLUMN_NAME)
            : 0
          instance[emitterName].emit('hasTotal', total)
        })

        return fetcher.fetchRelation(relation, typename, fetchOpts, callback)
      }

      // this "separate-totals style" is DEPRECATED
      if (hasTotal) {
        result[graphqlName + 'Total'] = instance =>
          new Promise((resolve, reject) => {
            instance[emitterName].on('hasTotal', resolve)
            setTimeout(() => reject(new Error('timeout')), 6000)
          })
      }
    }, {})
  )
}

export function resolveAttribute (result, attr) {
  // `x` here is the "resolver obj argument":
  // https://www.apollographql.com/docs/graphql-tools/resolvers.html#Resolver-obj-argument
  result[camelCase(attr)] = x => {
    if (typeof x[attr] === 'function') return x[attr]()
    if (x.hasOwnProperty(attr)) return x[attr]
    if (x.get) return x.get(attr)
  }
}
