import convertGraphqlData from './convertGraphqlData'

export function findLocation (data) {
  let query

  if (!data.address_street && !data.address_number && !data.full_text) return null
  if (data.address_number && data.address_street) {
    query = {
      where: {
        address_number: data.address_number,
        address_street: data.address_street,
        city: data.city || null,
        locality: data.locality || null,
        neighborhood: data.neighborhood || null,
        postcode: data.postcode || null,
        country_code: data.country_code || null
      }
    }
  } else if (data.full_text) {
    query = {
      where: {
        full_text: data.full_text
      }
    }
  }
  return Location.query(query).fetch()
}

export function findOrCreateLocation (data) {
  const convertedData = convertGraphqlData(data)
  return findLocation(convertedData).then(location => location || Location.create(convertedData))
}
