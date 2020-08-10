import parse from 'csv-parse'
import request from 'request'
import { PassThrough } from 'stream'
import createPost from '../../api/models/post/createPost'
import { findOrCreateLocation } from '../../api/graphql/mutations/location'

export function createPostImporter (userId, communityId) {
  const parser = parse({ columns: true })

  let numPostsCreated = 0
  let errors = []

  parser.errors = []
  parser.numPostsCreated

  parser.on('readable', async function() {
    let record, location
    while (record = parser.read()) {
      try {
        const locationData = await geocode(record.location)
        location = await findOrCreateLocation(locationData)
      } catch (e) {
        parser.errors.push(e)
      }
      const postParams = Object.assign(record, {
        community_ids: [communityId],
        endTime: record.end_date ? new Date(record.end_date) : null,
        imageUrls: record.image_urls ? record.image_urls.split(/,?\s+/) : [],
        isPublic: record.is_public.toLowerCase() === 'true',
        location_id: location ? location.id : null,
        name: record.title,
        startTime: record.start_date ? new Date(record.start_date) : null,
        topicNames: record.topics ? record.topics.split(/,?\s+/) : [],
        type: record.type.toLowerCase()
      })

      try {
        await createPost(userId, postParams)
        parser.numPostsCreated = parser.numPostsCreated + 1
      } catch(e) {
        parser.errors.push(e.message)
      }
    }
  })

  // Catch any error
  parser.on('error', function(err){
    parser.errors.push(err.message)
  })

  return parser
}

function geocode(address) {
  if (!process.env.MAPBOX_TOKEN) return false

  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
    + encodeURIComponent(address) + '.json?access_token='
    + process.env.MAPBOX_TOKEN + '&limit=1';

  return new Promise((resolve, reject) => {
    request({ url, json: true }, (err, response, body) => {
      if (err) {
        reject('Error when geocoding "' + address + '": ' + err.message)
      } else if (!body.features || body.features.length == 0) {
        reject('Unable to find location "' + address + '"')
      } else {
        const result = body.features[0]
        resolve(convertMapboxToLocation(result))
      }
    })
  })
}

function convertMapboxToLocation (mapboxResult) {
  const context = mapboxResult.context
  const neighborhoodObject = context && context.find(c => c.id.includes('neighborhood'))
  const postcodeObject = context && context.find(c => c.id.includes('postcode'))
  const placeObject = context && context.find(c => c.id.includes('place'))
  const regionObject = context && context.find(c => c.id.includes('region'))
  const countryObject = context && context.find(c => c.id.includes('country'))

  let city = placeObject ? placeObject.text : mapboxResult.place_type[0] === 'place' ? mapboxResult.text : ''

  let address_number = ''
  let address_street = ''
  if (mapboxResult.properties.address) {
    // For Points of Interest and landmarks Mapbox annoyingly stores the address in a single string inside properties
    address_number = mapboxResult.properties.address.split(' ')[0]
    address_street = mapboxResult.properties.address.split(' ')[1]
  } else if (mapboxResult.place_type[0] === 'address') {
    address_street = mapboxResult.text
    address_number = mapboxResult.address
  }

  return {
    accuracy: mapboxResult.properties.accuracy,
    address_number,
    address_street,
    bbox: mapboxResult.bbox ? [{ lng: mapboxResult.bbox[0], lat: mapboxResult.bbox[1] }, { lng: mapboxResult.bbox[2], lat: mapboxResult.bbox[3] }] : null,
    center: { lng: mapboxResult.center[0], lat: mapboxResult.center[1] },
    city,
    country: countryObject && countryObject.short_code,
    full_text: mapboxResult.place_name,
    // geometry: [Point]
    // locality
    neighborhood: neighborhoodObject && neighborhoodObject.text,
    region: regionObject && regionObject.text,
    postcode: postcodeObject && postcodeObject.text
    // wikidata: String
  }
}
