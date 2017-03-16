import { camelCase, toPairs, transform } from 'lodash'
import applyPagination, { PAGINATION_TOTAL_COLUMN_NAME } from './util/applyPagination'
import initDataLoaders from './util/initDataLoaders'
import EventEmitter from 'events'

export default class Fetcher {
  constructor (models) {
    this.models = models
    this.loaders = initDataLoaders(models)
  }

  getResolvers () {
    return transform(this.models, (result, { typename }, name) => {
      result[typename] = this._createResolverForModel(name)
    }, {})
  }

  fetchRelation (relation, paginationOpts, tap) {
    const { targetTableName, type, parentFk } = relation.relatedData
    const loader = this.loaders[targetTableName]

    if (type === 'belongsTo') {
      return loader.load(parentFk)
    }

    const relationSpec = this._getModel(targetTableName)
    if (relationSpec.filter) relation = relationSpec.filter(relation)

    return this.loaders.queries.load(relation.query(q => {
      applyPagination(q, targetTableName, paginationOpts)
    }))
    .tap(tap)
    .then(instances => {
      // N.B. this caching doesn't take into account data added by withPivot
      instances.each(x => loader.prime(x.id, x))
      return loader.loadMany(instances.map('id'))
    })
  }

  fetchOne (tableName, id, idColumn = 'id') {
    const { model, filter } = this._getModel(tableName)
    let query = model.where(idColumn, id)
    if (filter) query = filter(query)
    return this.loaders.queries.load(query).then(instance => {
      if (!instance) return
      this.loaders[tableName].prime(instance.id, instance)
      return instance
    })
  }

  _createResolverForModel (name) {
    const { attributes, getters, relations, model } = this.models[name]

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
          return this.fetchRelation(relation, {first, cursor, order}, instances => {
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

  _getModel (tableName) {
    if (!this.models[tableName]) {
      throw new Error(`missing model definition for ${tableName}`)
    }
    return this.models[tableName]
  }
}
