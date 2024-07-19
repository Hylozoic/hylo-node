import { pick } from 'lodash'
import { omitBy } from 'lodash/fp'
import { inspect } from 'util'
import { randomBytes } from 'crypto'

// a means of identifying duplicate Bookshelf queries. ideally we would compare
// the final SQL query text, but this is surprisingly difficult to find for some
// types of Bookshelf relations. so this is a hacked-together workaround.
export default function uniqueQueryID (query) {
  const signature = omitBy(x => !x, pick(query.relatedData, [
    'parentTableName', 'parentId', 'parentFk',
    'joinTableName', 'foreignKey', 'otherKey',
    'targetTableName', 'type'
  ]))
  if (!query._knex) { // query is invalid, don't cache
    return randomBytes(4).toString('hex')
  }
  return inspect(signature) + inspect(pick(query._knex.toSQL(), 'sql', 'bindings'))
}
