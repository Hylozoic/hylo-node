import { camelCase, toPairs, transform } from 'lodash'
import EventEmitter from 'events'
import { PAGINATION_TOTAL_COLUMN_NAME } from './util/applyPagination'

export default function makeResolvers (models, fetcher) {
  return transform(models, (result, spec, name) => {
    result[spec.typename] = createResolverForModel(name, spec, fetcher)
  }, {})
}

function createResolverForModel (name, spec, fetcher) {
  const { attributes, getters, relations, model } = spec

  return Object.assign(
    transform(attributes, (result, attr) => {
      result[camelCase(attr)] = x => x[attr] || x.get(attr)
    }, {}),

    transform(getters, (result, fn, attr) => {
      result[attr] = fn
    }, {}),

    transform(relations, (result, attr) => {
      const [ graphqlName, bookshelfName ] = typeof attr === 'string'
        ? [attr, attr] : toPairs(attr)[0]

      const emitterName = `__${graphqlName}__total_emitter`

      result[graphqlName] = (instance, { first, cursor, order }) => {
        instance[emitterName] = new EventEmitter()
        const relation = instance[bookshelfName]()
        return fetcher.fetchRelation(relation, {first, cursor, order}, instances => {
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
