import applyPagination from './util/applyPagination'
import presentQuerySet from './util/presentQuerySet'
import initDataLoaders from './util/initDataLoaders'
import { isNull, isUndefined, mapKeys, omitBy, pick, result, snakeCase, toPairs } from 'lodash/fp'

export default class Fetcher {
  constructor (models, options = {}) {
    this.models = models

    // here we allow changing loader behavior to make testing easier
    const setupLoaders = options.setupLoaders || initDataLoaders
    this.loaders = setupLoaders(models)
  }

  fetchRelation (relation, typename, fetchOpts, tap) {
    let targetTableName, type, parentFk
    if (!relation) {
      // Sometimes we return no relation from a conditional relationship (e.g. Post.eventInvitations for a non event Post)
      // In this case just return an empty array or query set
      return fetchOpts.querySet ? presentQuerySet([], { first: 1 }) : []
    }
    if (relation.relatedData) {
      targetTableName = relation.relatedData.targetTableName
      type = relation.relatedData.type
      parentFk = relation.relatedData.parentFk
    } else {
      // this is a hack to allow relations that are not "proper" bookshelf
      // relations, i.e. they don't use Model#hasMany() et al. it seems that
      // we could go much further and merge getters and relations into a single
      // concept in the graphql-bookshelf-bridge model spec language. TBD.
      targetTableName = relation.tableName()
      type = 'hasMany' // n.b. we're not supporting belongsTo yet
    }

    if (!typename) typename = this._getTypenameFromTableName(targetTableName)

    const loader = this.loaders[typename]

    if (type === 'belongsTo') {
      if (!parentFk) return Promise.resolve()
      return loader.load(parentFk)
    }

    // apply the filter that always applies to this target model, if any
    const model = this._getModel(typename)

    if (model.filter) relation = model.filter(relation)

    // apply the filter that applies to this specific pair of models, if any
    if (fetchOpts.filter) relation = fetchOpts.filter(relation)

    if (type === 'hasOne') {
      return this._loadOne(relation, { loader })
    }

    const query = relation.query(q => {
      applyPagination(q, targetTableName, fetchOpts)
    })

    return this._loadMany(query, {loader, fetchOpts, tap})
  }

  fetchOne (typename, id, idColumn = 'id', args = false) {
    if (!id) return Promise.resolve(null)

    const { model, filter } = this._getModel(typename)
    const tableName = model.collection().tableName()
    let relation = model.where(`${tableName}.${idColumn}`, id)
    if (filter) relation = filter(relation)
    if (args) {
      const whitelist = mapKeys((k) => snakeCase(k), pick(['visibility', 'group_data_type'], args))
      relation = relation.where(whitelist)
    }
    return this.loaders.relations.load({relation}).then(instance => {
      if (!instance) return
      this.loaders[typename].prime(instance.id, instance)
      return instance
    })
  }

  fetchMany (typename, args) {
    const { fetchMany, filter } = this._getModel(typename)
    const fetchOpts = {
      querySet: true,
      offset: args.offset,
      first: args.first
    }

    let query = fetchMany(args)
    if (filter) query = filter(query)
    query = query.query(q =>
      applyPagination(q, result('tableName', query), fetchOpts))

    return this._loadMany(query, {
      method: 'fetchAll',
      loader: this.loaders[typename],
      fetchOpts
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

  _loadMany (relation, { method, loader, tap, fetchOpts }) {
    return this.loaders.relations.load({relation, method})
    .tap(tap)
    .then(instances => {
      // N.B. this caching doesn't take into account data added by withPivot
      instances.forEach(x => loader.clear(x.id).prime(x.id, x))
      return loader.loadMany(instances.map('id'))
      .then(models => {
        if (!fetchOpts.querySet) return models
        const cleanOpts = omitBy(x => isNull(x) || isUndefined(x), fetchOpts)
        const optsWithDefaults = Object.assign({offset: 0, first: 20}, cleanOpts)
        return presentQuerySet(models, optsWithDefaults)
      })
    })
  }

  _loadOne (relation, { loader }) {
    return this.loaders.relations.load({relation})
    .then(instance => {
      if (!instance) return null
      loader.prime(instance.id, instance)
      return loader.load(instance.id)
    })
  }
}
