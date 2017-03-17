import applyPagination from './util/applyPagination'
import initDataLoaders from './util/initDataLoaders'

export default class Fetcher {
  constructor (models) {
    this.models = models
    this.loaders = initDataLoaders(models)
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

  _getModel (tableName) {
    if (!this.models[tableName]) {
      throw new Error(`missing model definition for ${tableName}`)
    }
    return this.models[tableName]
  }
}
