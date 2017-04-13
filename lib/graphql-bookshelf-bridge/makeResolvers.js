import { camelCase, pick, toPairs, transform } from 'lodash'
import EventEmitter from 'events'
import { PAGINATION_TOTAL_COLUMN_NAME } from './util/applyPagination'

export default function makeResolvers (models, fetcher) {
  return transform(models, (result, spec, typename) => {
    result[typename] = createResolverForModel(typename, spec, fetcher)
  }, {})
}

function createResolverForModel (typename, spec, fetcher) {
  const { attributes, getters, relations, model } = spec

  return Object.assign(
    transform(attributes, (result, attr) => {
      result[camelCase(attr)] = x => {
        if (typeof x[attr] === 'function') return x[attr]()
        return x[attr] || x.get(attr)
      }
    }, {}),

    transform(getters, (result, fn, attr) => {
      result[attr] = fn
    }, {}),

    transform(relations, (result, attr) => {
      var graphqlName, bookshelfName, typename

      if (typeof attr === 'string') {
        graphqlName = attr
        bookshelfName = attr
      } else {
        const [ name, opts ] = toPairs(attr)[0]
        bookshelfName = name

        // relations can be aliased: in your model definition, you can write
        // e.g. `relations: [{users: {alias: 'members'}}]` to map `members` in
        // your GraphQL schema to the `users` Bookshelf relation.
        graphqlName = opts.alias || name

        // this must be set when a relation's Bookshelf model is backing more
        // than one GraphQL schema type.
        typename = opts.typename
      }

      const emitterName = `__${graphqlName}__total_emitter`

      result[graphqlName] = (instance, args) => {
        const fetchOpts = pick(args, 'first', 'cursor', 'order', 'sortBy', 'offset')
        instance[emitterName] = new EventEmitter()
        const relation = instance[bookshelfName]()
        return fetcher.fetchRelation(relation, typename, fetchOpts,
          instances => {
            const total = instances.length > 0
              ? instances.first().get(PAGINATION_TOTAL_COLUMN_NAME)
              : null
            instance[emitterName].emit('hasTotal', total)
          })
      }

      if (model.forge()[bookshelfName]().relatedData.type !== 'belongsTo') {
        result[graphqlName + 'Total'] = instance =>
          new Promise((resolve, reject) => {
            instance[emitterName].on('hasTotal', resolve)
            setTimeout(() => reject(new Error('timeout')), 6000)
          })
      }
    }, {})
  )
}
