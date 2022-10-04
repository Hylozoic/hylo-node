const { GraphQLYogaError } = require('@graphql-yoga/node')
import validator from 'validator'

export async function canDeleteAffiliation (userId, affiliationId) {
  const affiliation = await Affiliation.find(affiliationId)
  return affiliation.get('user_id') === userId
}

export function formatUrl (url = '') {
  const prefixRegex = /https?\:\/\//gi;
  const prefix = url.match(prefixRegex)
  if (!prefix) url = 'https://' + url
  return url
}

export async function createAffiliation (userId, { role, preposition, orgName, url = '' }) {
  if (url.length > 0 && !validator.isURL(formatUrl(url))) throw new GraphQLYogaError(`Please enter a valid URL.`)
  if (userId && role && preposition && orgName) {
    return Affiliation.create({
      userId,
      role,
      preposition,
      orgName,
      url: url.length > 0 ? formatUrl(url) : url
    })
  } else {
    throw new GraphQLYogaError(`Invalid parameters to create affiliation`)
  }
}

export function deleteAffiliation (userId, id) {
  if (userId && id && canDeleteAffiliation(userId, id)) {
    return Affiliation.delete(id)
  } else {
    throw new GraphQLYogaError(`Invalid parameters to delete affiliation`)
  }
}
