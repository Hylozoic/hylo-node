import validator from 'validator'

export async function canDeleteAffiliation (userId, affiliationId) {
  const affiliation = await Affiliation.find(affiliationId)
  return affiliation.get('user_id') === userId
}

export async function createAffiliation (userId, { role, preposition, orgName, url }) {
  if (!validator.isURL(url)) throw new Error(`Please enter a valid URL.`)
  if (userId && role && preposition && orgName) {
    return Affiliation.create({
      userId,
      role,
      preposition,
      orgName,
      url
    })
  } else {
    throw new Error(`Invalid parameters to create affiliation`)
  }
}

export function deleteAffiliation (userId, id) {
  if (userId && id && canDeleteAffiliation(userId, id)) {
    return Affiliation.delete(id)
  } else {
    throw new Error(`Invalid parameters to delete affiliation`)
  }
}
