import { camelCase, isArray, mapValues, toPairs, transform } from 'lodash'
import { map, some, values } from 'lodash/fp'
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
      return loader.load(parentFk).then(x =>
        this._formatBookshelfInstance(targetTableName, x))
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
      .then(map(x => this._formatBookshelfInstance(targetTableName, x)))
    })
  }

  fetchOne (tableName, id, idColumn = 'id') {
    const { model, filter } = this._getModel(tableName)
    let query = model.where(idColumn, id)
    if (filter) query = filter(query)
    return this.loaders.queries.load(query).then(instance => {
      if (!instance) return
      this.loaders[tableName].prime(instance.id, instance)
      return this._formatBookshelfInstance(tableName, instance)
    })
  }

  // once we have an instance, we format it; that means we look at the model
  // definition and prepare a result object with attributes that match that
  // definition. we set basic attributes directly, because they have already
  // been retrieved at this point; but we set up relations as functions, so they
  // will not run any additional database queries unless the current GraphQL
  // query specifically asks for them.
  _formatBookshelfInstance (name, instance) {
    const { typename, model, attributes, getters, relations } = this.models[name]
    const tableName = model.collection().tableName()
    if (instance.tableName !== tableName) {
      throw new Error(`table names don't match: "${instance.tableName}", "${tableName}"`)
    }

    const formatted = Object.assign(
      {
        __typename: typename
      },

      transform(attributes, (result, attr) => {
        const value = instance[attr] || instance.get(attr)
        result[camelCase(attr)] = this._formatValue(value)
      }, {}),

      transform(getters, (result, fn, attr) => {
        result[attr] = args => {
          const val = fn(instance, args)
          // notice that return value is a certain type
          // be smart about formatting its contents if they are bookshelf model
          // instances
          return isArray(val)
            ? val.map(this._formatValue.bind(this))
            : this._formatValue(val)
        }
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

  // attributes of plain JS objects and return values from getter methods could
  // be Bookshelf instances; in this case, we must format them appropriately
  _formatValue (value) {
    return isBookshelfInstance(value)
      ? this.formatInstance(value.tableName, value)
      : some(isBookshelfInstance, values(value))
        ? mapValues(value, this._formatValue.bind(this))
        : value
  }
}

function isBookshelfInstance (x) {
  return x instanceof bookshelf.Model
}
