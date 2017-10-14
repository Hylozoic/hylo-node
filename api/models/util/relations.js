import { camelCase, mapKeys, reduce } from 'lodash/fp'

const valuesToString = (v, k, acc) => {
  const stringifyKeys = [
    'id',
    'createdAt',
    'updatedAt'
  ]
  acc[k] = stringifyKeys.includes(k) ? v.toString() : v
  return acc
}

// Pick some fields from a `belongsTo` relation. Takes a relation and an array
// of field names. Snake case will be rewritten to camelcase in output property
// names. Some values are converted via toString (dates, ids).
export const refineOne = (relation, fields) => {
  // A relation might simply not be set, so not a programmer error:
  if (!relation) return null

  // Lack of field names is a problem though...
  if (!Array.isArray(fields)) throw new Error ('Expected an array of field names.')

  return reduce(
    valuesToString,
    mapKeys(k => camelCase(k), relation.pick(fields)),
    {}
  )
}

// Pick some fields from a `belongsToMany` relation
export const refineMany = (relation, fields) => {
  if (!relation) return []
  if (!Array.isArray(fields)) throw new Error ('Expected an array of field names.')
  return relation.map(entity => refineOne(entity, fields))
}
