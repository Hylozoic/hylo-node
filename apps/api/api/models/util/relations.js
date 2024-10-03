import { camelCase, mapKeys } from 'lodash/fp'

// Pick some fields from a `belongsTo` relation. Takes a relation and an array
// of field names. Snake case will be rewritten to camelcase in output property
// names. An optional third parameter specifies fields to rewrite. For example:
//
//   refineOne(
//     post,
//     [ 'id', 'created_at', 'name' ],
//     { 'name': 'title' }
//   )
//
// would yield something like:
//
//   { createdAt: '...', id: '1', 'title': 'Aardvarks' }
export const refineOne = (relation, fields, rewrite) => {
  // A relation might simply not be set, so not a programmer error:
  if (!relation) return null

  // Lack of field names is a problem though...
  if (!Array.isArray(fields)) throw new Error('Expected an array of field names.')

  return mapKeys(
    k => rewrite && rewrite[k] ? rewrite[k] : camelCase(k),
    relation.pick(fields)
  )
}

// Pick some fields from a `belongsToMany` relation
export const refineMany = (relation, fields, rewrite) => {
  if (!relation) return []
  if (!Array.isArray(fields)) throw new Error('Expected an array of field names.')
  return relation.map(entity => refineOne(entity, fields, rewrite))
}
