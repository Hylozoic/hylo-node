import { isEmpty, pick } from 'lodash'

export const throwErrorIfMissingTags = (tags, communityIds) => {
  return Tag.nonexistent(tags, communityIds)
  .then(nonexistent => {
    if (isEmpty(nonexistent)) return
    const error = new Error('some new tags are missing descriptions')
    error.tagsMissingDescriptions = nonexistent
    throw error
  })
}

export const handleInvalidFinancialRequestsAmountError = (err, res) => {
  if (err.invalidFinancialRequestsAmountError) {
    res.status(422)
    res.send(pick(err, 'invalidFinancialRequestsAmountError'))
    return true
  }
}

export const handleMissingTagDescriptions = (err, res) => {
  if (err.tagsMissingDescriptions) {
    res.status(422)
    res.send(pick(err, 'tagsMissingDescriptions'))
    return true
  }
}

export const handlePostValidations = (err, res) => {
  if (err.postValidations) {
    res.status(422)
    res.send(pick(err, 'postValidations'))
    return true
  }
}
