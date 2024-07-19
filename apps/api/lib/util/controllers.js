import { isEmpty, pick } from 'lodash'

export const throwErrorIfMissingTags = (tags, groupIds) => {
  return Tag.nonexistent(tags, groupIds)
  .then(nonexistent => {
    if (isEmpty(nonexistent)) return

    const error = new Error('some new tags are missing descriptions')
    error.tagsMissingDescriptions = nonexistent
    throw error
  })
}

export const handleMissingTagDescriptions = (err, res) => {
  if (err.tagsMissingDescriptions) {
    res.status(422)
    res.send(pick(err, 'tagsMissingDescriptions'))
    return true
  }
}
