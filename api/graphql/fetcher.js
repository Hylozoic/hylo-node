import { camelCase, toPairs, transform } from 'lodash'
import { map } from 'lodash/fp'
import applyPagination, { PAGINATION_TOTAL_COLUMN_NAME } from './util/applyPagination'
import initDataLoaders from './util/initDataLoaders'
import EventEmitter from 'events'

export default class Fetcher {
  constructor (models) {
    this.models = models
    this.loaders = initDataLoaders(models)
  }

  fetchRelation (relation, paginationOpts, tap) {
    const { targetTableName, type, parentFk } = relation.relatedData
    const loader = this.loaders[targetTableName]

    if (type === 'belongsTo') {
      return loader.load(parentFk).then(x => this.format(targetTableName, x))
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
      .then(map(x => this.format(targetTableName, x)))
    })
  }

  fetchOne (tableName, id, idColumn = 'id') {
    const { model, filter } = this._getModel(tableName)
    let query = model.where(idColumn, id)
    if (filter) query = filter(query)
    return this.loaders.queries.load(query).then(instance => {
      if (!instance) return
      this.loaders[tableName].prime(instance.id, instance)
      return this.format(tableName, instance)
    })
  }

  // once we have an instance, we format it; that means we look at the model
  // definition and prepare a result object with attributes that match that
  // definition. we set basic attributes directly, because they have already
  // been retrieved at this point; but we set up relations as functions, so they
  // will not run any additional database queries unless the current GraphQL
  // query specifically asks for them.
  format (name, instance) {
    const { model, attributes, getters, relations } = this.models[name]
    const tableName = model.collection().tableName()
    if (instance.tableName !== tableName) {
      throw new Error(`table names don't match: "${instance.tableName}", "${tableName}"`)
    }

    const formatted = Object.assign(
      transform(attributes, (result, attr) => {
        console.log(`${tableName} ${instance.id} ${attr} => ${camelCase(attr)} => ${instance.get(attr)}`)
        result[camelCase(attr)] = instance.get(attr)
      }, {}),

      transform(getters, (result, fn, attr) => {
        result[attr] = args => fn(instance, args)
      }, {}),

      transform(relations, (result, attr) => {
        const [ graphqlName, bookshelfName ] = typeof attr === 'string'
          ? [attr, attr] : toPairs(attr)[0]

        const emitter = new EventEmitter()

        result[graphqlName] = ({ first, cursor, order }) => {
          const relation = instance[bookshelfName]()
          return this.fetchRelation(relation, {first, cursor, order}, instances => {
            const total = instances.length > 0
              ? instances.first().get(PAGINATION_TOTAL_COLUMN_NAME)
              : null
            emitter.emit('hasTotal', total)
          })
        }

        result[graphqlName + 'Total'] = () =>
          new Promise((resolve, reject) => {
            emitter.on('hasTotal', resolve)
            setTimeout(() => reject(new Error('timeout')), 6000)
          })
      }, {})
    )

    return formatted
  }

  _getModel (tableName) {
    if (!this.models[tableName]) {
      throw new Error(`missing model definition for ${tableName}`)
    }
    return this.models[tableName]
  }
}
