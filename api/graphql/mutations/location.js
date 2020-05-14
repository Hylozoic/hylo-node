import convertGraphqlData from './convertGraphqlData'

export function findLocation (data) {
  return Location.query({where: {
    address_number: data.address_number || null,
    address_street: data.address_street || null,
    city: data.city || null,
    locality: data.locality || null,
    neighborhood: data.neighborhood || null,
    postcode: data.postcode || null,
    country: data.country || null
  }}).fetch()
}

export function findOrCreateLocation (data) {
  const convertedData = convertGraphqlData(data)
  return findLocation(convertedData).then(location => location || Location.create(convertedData))
}


