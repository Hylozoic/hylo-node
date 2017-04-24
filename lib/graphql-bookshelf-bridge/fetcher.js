import applyPagination, { PAGINATION_TOTAL_COLUMN_NAME } from './util/applyPagination'
import initDataLoaders from './util/initDataLoaders'
import { toPairs } from 'lodash'

export default class Fetcher {
  constructor (models) {
    this.models = models
    this.loaders = initDataLoaders(models)
  }

  fetchRelation (relation, typename, fetchOpts, tap) {
    const { targetTableName, type, parentFk } = relation.relatedData
    if (!typename) typename = this._getTypenameFromTableName(targetTableName)
    const loader = this.loaders[typename]

    if (type === 'belongsTo') {
      if (!parentFk) return Promise.resolve()
      return loader.load(parentFk)
    }

    const relationSpec = this._getModel(typename)
    if (relationSpec.filter) relation = relationSpec.filter(relation)

    const query = relation.query(q => {
      applyPagination(q, targetTableName, fetchOpts)
    })

    return this._loadMany(query, {loader, fetchOpts, tap})
  }

  fetchOne (typename, id, idColumn = 'id') {
    const { model, filter } = this._getModel(typename)
    let query = model.where(idColumn, id)
    if (filter) query = filter(query)
    return this.loaders.queries.load({query}).then(instance => {
      if (!instance) return
      this.loaders[typename].prime(instance.id, instance)
      return instance
    })
  }

  fetchMany (typename, args) {
    const { fetchMany } = this._getModel(typename)
    let query = fetchMany(args)
    return this._loadMany(query, {
      method: 'fetchAll',
      loader: this.loaders[typename],
      fetchOpts: {
        querySet: true,
        offset: args.offset,
        first: args.first
      }
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

  _loadMany (query, { method, loader, tap, fetchOpts }) {
    return this.loaders.queries.load({query, method})
    .tap(tap)
    .then(instances => {
      // N.B. this caching doesn't take into account data added by withPivot
      instances.each(x => loader.prime(x.id, x))
      return loader.loadMany(instances.map('id'))
      .then(models => {
        if (!fetchOpts.querySet) return models

        const total = models.length > 0
          ? Number(models[0].get(PAGINATION_TOTAL_COLUMN_NAME))
          : 0
        const { offset = 0, first = 0 } = fetchOpts

        return {
          items: models,
          total,
          hasMore: offset + first < total
        }
      })
    })
  }
}
