import { chain, isEmpty, times } from 'lodash'

export default function (term, qb, { columns }) {
  const query = chain(term.split(/\s*\s/)) // split on whitespace
  .map(word => word.replace(/[,;|:&()!\\]+/, ''))
  .reject(isEmpty)
  .map(word => word + ':*') // add prefix matching
  .reduce((result, word) => {
    // build the tsquery string using logical AND operands
    result += ' & ' + word
    return result
  }).value()

  const statement = columns
    .map(col => `(to_tsvector('english', ${col}) @@ to_tsquery(?))`)
    .join(' or ')

  const values = times(columns.length, () => query)

  qb.where(function () {
    this.whereRaw(`(${statement})`, values)
  })
}
