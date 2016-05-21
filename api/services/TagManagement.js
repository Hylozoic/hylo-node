import { reduce, toPairs, trim } from 'lodash'
import { filter, sortBy } from 'lodash/fp'

const cleanName = name =>
  trim(name.toLowerCase(), ' -').replace(/-{2,}/, '-')

export const cleanupAll = () => {
  return Tag.query().select(['id', 'name'])
  .then(rows => reduce(rows, (groups, row) => {
    const name = cleanName(row.name)
    if (!groups[name]) groups[name] = []
    groups[name].push(row)
    return groups
  }, {}))
  .then(groups => Promise.map(toPairs(groups), ([name, tags]) => {
    const primaryTag = sortBy('id', tags)[0]
    if (tags.length === 1) return
    console.log(`${name}: ${tags.length}`)

    const otherTags = filter(t => t.id !== primaryTag.id, tags)
    return Promise.map(otherTags, t => Tag.merge(primaryTag.id, t.id))
    .then(() => Tag.where('id', primaryTag.id).query().update({name}))
  }))
  .then(() => 'ok')
}
