import { camelCase, toPairs, transform } from 'lodash'
import { map } from 'lodash/fp'
import applyPagination from './util/applyPagination'
import initDataLoaders from './util/initDataLoaders'

export default class Fetcher {
  constructor (models) {
    this.models = models
    this.loaders = initDataLoaders(models)
  }

  fetchRelation (relation, paginationOpts) {
    const { targetTableName, type, parentFk } = relation.relatedData
    const loader = this.loaders[targetTableName]

    if (type === 'belongsTo') {
      return loader.load(parentFk).then(x => this.format(targetTableName, x))
    }

    const relationSpec = this.models[targetTableName]
    if (relationSpec.filter) relation = relationSpec.filter(relation)

    return this.loaders.queries.load(relation.query(q => {
      applyPagination(q, paginationOpts)
    }))
    .then(instances => {
      // N.B. this caching doesn't take into account data added by withPivot
      instances.each(x => loader.prime(x.id, x))
      return loader.loadMany(instances.map('id'))
      .then(map(x => this.format(targetTableName, x)))
    })
  }

  fetchOne (tableName, id, idColumn = 'id') {
    const { model, filter } = this.models[tableName]
    const query = filter(model.where(idColumn, id))
    return this.loaders.queries.load(query).then(instance => {
      if (!instance) return
      this.loaders[tableName].prime(instance.id, instance)
      return this.format(tableName, instance)
    })
  }

  format (name, instance) {
    const { model, attributes, getters, relations } = this.models[name]
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
          return this.fetchRelation(relation, {first, cursor, order})
        }
      }, {})
    )

    return formatted
  }
}
