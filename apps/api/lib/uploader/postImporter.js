import parse from 'csv-parse'
import request from 'request'
import { PassThrough } from 'stream'
import createPost from '../../api/models/post/createPost'
import { findOrCreateLocation } from '../../api/graphql/mutations/location'

function createObjectFrom(record, userId, groupId) {
  return new Promise(async (resolve, reject) => {
    let location
    try {
      const locationData = await geocode(record.location)
      location = await findOrCreateLocation(locationData)
    } catch (e) {
      sails.log.error("Error finding post location: " + e)
      reject(e)
      return
    }

    const postParams = {
      group_ids: [groupId],
      description: record.description || '',
      endTime: record.end_date ? new Date(record.end_date) : null,
      location: record.location,
      imageUrls: record.image_urls ? record.image_urls.split(/,?\s+/) : [],
      isPublic: record.is_public ? ['true', 'yes'].includes(record.is_public.toLowerCase()) : false,
      location_id: location ? location.id : null,
      name: record.title || '',
      startTime: record.start_date ? new Date(record.start_date) : null,
      topicNames: record.topics ? record.topics.split(/,?\s+/) : [],
      type: record.type ? record.type.toLowerCase() : 'discussion'
    }

    try {
      const post = await createPost(userId, postParams)
      sails.log.info("Finished creating post", postParams)
      resolve(post)
    } catch(e) {
      sails.log.error("Error importing post: " + e.message)
      reject(e)
    }
  })
}

export function createPostImporter (userId, groupId) {
  const parser = parse({ columns: header => header.map(column => column.toLowerCase()) })

  parser.errors = []
  parser.numPostsCreated = 0
  const promiseFactories = []

  parser.on('readable', () => {
    let record = parser.read();

    if (record === null) {
      return
    }
    const promiseFactory = () => createObjectFrom(record, userId, groupId);
    promiseFactories.push( promiseFactory );
  })

  parser.on('error', (err) => { sails.log.error("Weird parser error, check out " + err)})

  parser.on('end', () => {
    var sequence = Promise.resolve();

    // Loop over each promise factory and add on a promise to the end of the 'sequence' promise.
    promiseFactories.forEach(promiseFactory => {
      sequence = sequence
        .then(promiseFactory)
        .then(result => { parser.numPostsCreated = parser.numPostsCreated + 1 })
        .catch(error => { parser.errors.push(error.message ? error.message : error) })
    })

    // This will resolve after the entire chain is resolved
    sequence.then(() => { sails.log.info("Succesfully imported " + parser.numPostsCreated + " posts.\n Errors: " + parser.errors.join("\n"))})
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
