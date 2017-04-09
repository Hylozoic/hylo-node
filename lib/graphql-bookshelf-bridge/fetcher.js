import applyPagination from './util/applyPagination'
import initDataLoaders from './util/initDataLoaders'
import { toPairs } from 'lodash'

export default class Fetcher {
  constructor (models) {
    this.models = models
    this.loaders = initDataLoaders(models)
  }

  fetchRelation (relation, typename, paginationOpts, tap) {
    const { targetTableName, type, parentFk } = relation.relatedData
    if (!typename) typename = this._getTypenameFromTableName(targetTableName)
    const loader = this.loaders[typename]

    if (type === 'belongsTo') {
      if (!parentFk) return Promise.resolve()
      return loader.load(parentFk)
    }

    const relationSpec = this._getModel(typename)
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

  fetchOne (typename, id, idColumn = 'id') {
    const { model, filter } = this._getModel(typename)
    let query = model.where(idColumn, id)
    if (filter) query = filter(query)
    return this.loaders.queries.load(query).then(instance => {
      if (!instance) return
      this.loaders[typename].prime(instance.id, instance)
      return instance
    })
  }

  _getModel (typename) {
    if (!this.models[typename]) {
      throw new Error(`missing model definition for ${typename}`)
    }
    return this.models[typename]
  }

  _getTypenameFromTableName (tableName) {
    // TODO cache this
    const matches = toPairs(this.models)
    .filter(([typename, spec]) => spec.model.collection().tableName() === tableName)

    if (matches.length > 1) {
      const defaultTypeForTable = matches.find(([typename, spec]) => spec.isDefaultTypeForTable)
      if (defaultTypeForTable) return defaultTypeForTable[0]

      throw new Error(`tableName "${tableName}" is ambiguous: ${matches.map(x => x[0]).join(', ')}`)
    }

    if (matches.length === 0) {
      throw new Error(`tableName "${tableName}" doesn't match any type`)
    }

    return matches[0][0]
  }
}
