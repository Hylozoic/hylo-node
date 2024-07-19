/* eslint-disable camelcase */
const { sample, partition } = require('lodash')
const knexPostgis = require('knex-postgis')
const { faker } = require('@faker-js/faker')
const {
  ANIMAL_LIST,
  CLIMATE_ZONES,
  COLLABORATION_INTERESTS,
  FARM_CERTIFICATIONS,
  FARM_GOALS,
  FARM_MOTIVATIONS,
  FARM_PRODUCT_LIST,
  FARM_TYPES,
  HARDINESS_ZONES,
  LOCATION_PRIVACY,
  MANAGEMENT_PLANS,
  PREFERRED_CONTACT_METHODS,
  PRODUCT_CATAGORIES,
  PUBLIC_OFFERINGS,
} = require('../../lib/constants')
const { v4: uuidv4 } = require('uuid')

exports.seed = (knex) => seed('locations', knex)
  .then(() => seed('users', knex))
  .then(() => seed('groups', knex))
  .then(() => seed('posts', knex))
  .then(() => addUsersToGroups(knex))
  .then(() => addPostsToGroups(knex))
  .then(() => addFarmExtensionToGroups(knex))
  .then(() => addlocationsToUsers(knex))
  .then(() => addlocationsToGroups(knex))
  .then(() => addlocationsToPosts(knex))
  .then(() => addWidgetsToGroups(knex))
  .catch(err => {
    let report = err.message
    if (err.message.includes('unique constraint')) {
      report =
`
Error during seeding.

This isn't uncommon: Faker generates a limited number of unique names,
and sometimes they collide. You should be able to simply re-run the
seed until it passes (sometimes four or five tries are required).

${err.message}
`
    }
    console.error(report)
  })

const n = {
  groups: 24,
  posts: 80,
  users: 50,
  locations: 200
}

const fake = {
  groups: fakeGroup,
  posts: fakePost,
  users: fakeUser,
  locations: fakeLocation
}

function seed (entity, knex) {
  console.info(`  --> ${entity}`, n[entity], fake[entity])
  return Promise.all(
    [...new Array(n[entity])].map(
      () => fake[entity](knex).then(row => knex(entity).insert(row))
    )
  )
}

function moderatorOrMember () {
  // Role 1 is moderator
  return Math.random() > 0.5 ? 1 : 0 // for farms, half the members will be moderators, on average
}

function fakeLocation (knex) {
  const st = knexPostgis(knex)
  const city = faker.address.city()
  const address_street = faker.address.streetName()
  const country = faker.address.country()
  const locality = null
  const address_number = faker.datatype.number({ min: 1, max: 1000 })
  const fakeLat = faker.address.latitude(42, 38) // TODO: is this the right syntax???
  const fakeLng = faker.address.longitude(-119, -122)
  const center = st.geomFromText('POINT(' + fakeLng + ' ' + fakeLat + ')', 4326)
  const full_text = `${address_number} ${address_street}, ${city}, ${locality}, ${country}`
  const region = faker.address.state()

  return Promise.resolve({
    center,
    full_text,
    address_street,
    address_number,
    city,
    locality,
    region,
    country,
    neighborhood: 'fakesville',
    created_at: knex.fn.now()
  })
}

function addUsersToGroups (knex) {
  console.info('  --> farm group_memberships')
  return knex('users').select('id')
    .whereRaw('users.email ILIKE \'%@farm-demo.com\'')
    .then(users => Promise.all(users.map(({ id }) => fakeMembership(id, knex))))
}

function addlocationsToUsers (knex) {
  console.info('  --> user locations')
  return knex('users').select('id')
    .whereRaw('users.email ILIKE \'%@farm-demo.com\'')
    .then(users => Promise.all(users.map(({ id }) => updateLocationId(id, knex, 'users'))))
}

function addlocationsToGroups (knex) {
  console.info('  --> farm group locations')
  return knex('groups').select('id')
    .whereRaw('groups.type = \'farm\' and groups.name ILIKE \'% farm\'')
    .then(groups => Promise.all(groups.map(({ id }) => updateLocationId(id, knex, 'groups'))))
}

function addlocationsToPosts (knex) {
  console.info('  --> farm post locations')
  return knex('posts').select('id')
    .whereRaw('posts.description ILIKE \'fake-farm%\'')
    .then(posts => Promise.all(posts.map(({ id }) => updateLocationId(id, knex, 'posts'))))
}

function updateLocationId (id, knex, table) {
  return sampleDB('locations', knex.raw('locations.neighborhood = \'fakesville\''), knex)
    .then(([location]) => knex(table)
      .where(`${table}.id`, '=', id)
      .update({
        location_id: location.id
      })
    )
}

function fakeGroup (knex) {
  const name = faker.random.words() + ' farm'

  return Promise.all([
    sampleDB('users', knex.raw('users.email ILIKE \'%@farm-demo.com\''), knex) // select only farm-demo users to create these specific posts for
  ]).then(([users]) => fakeGroupData(name, faker.helpers.slugify(name).toLowerCase(), users[0].id, 'farm'))
}

function fakeMembership (user_id, knex) {
  return sampleDB('groups', knex.raw('groups.type = \'farm\''), knex) // only sample from farm type groups
    .then(([group]) => knex('group_memberships')
      .insert({
        active: true,
        group_id: group.id,
        created_at: knex.fn.now(),
        role: moderatorOrMember(),
        settings: '{ "send_email": true, "send_push_notifications": true }',
        user_id
      }))
}

function fakePost (knex) {
  const type = ['discussion', 'resource', 'project', 'event', 'offer', 'request'][faker.datatype.number({ min: 0, max: 5 })]
  let start_time, end_time
  if (type !== 'discussion') {
    start_time = faker.date.soon(faker.datatype.number({ min: 1, max: 20 }))
    end_time = faker.date.future(faker.datatype.number({ min: 1, max: 2 }))
  }

  return sampleDB('users', knex.raw('users.email ILIKE \'%@farm-demo.com\''), knex) // select only farm-demo users to create these specific posts for
    .then(([user]) => ({
      name: faker.lorem.sentence(),
      type,
      description: `fake-farm: ${faker.lorem.paragraph()}`,
      created_at: faker.date.past(),
      user_id: user.id,
      active: true,
      visibility: 2,
      is_public: true,
      start_time,
      end_time
    }))
}

function addPostsToGroups (knex) {
  console.info('  --> farm groups_posts')
  return knex('posts')
    .select(['id as post_id', 'user_id'])
    .whereRaw('user_id in (select users.id as user_id from users where users.email ILIKE \'%@farm-demo.com\')')
    .then(posts => Promise.all(
      posts.map(({ post_id, user_id }) => knex('group_memberships')
        .where('group_memberships.user_id', user_id)
        .first('group_id')
        .then(({ group_id }) => knex('groups_posts')
          .insert({ post_id, group_id }))
      )))
}

async function addFarmExtensionToGroups (knex) {
  console.info('  --> farm group_extensions')
  return knex('groups')
    .select(['id as group_id'])
    .whereRaw('groups.type = \'farm\'')
    .then(groupIds => Promise.all(
      groupIds.map(({ group_id }, index) => knex('extensions')
        .where('type', 'farm-onboarding')
        .first('id')
        .then(({ id }) => {
          const timestamp = faker.date.past()
          return knex('group_extensions')
            .insert({ extension_id: id, group_id, active: true, created_at: timestamp, updated_at: timestamp, data: JSON.stringify(generateFakeFarmData(index)) })
        })
      )))
}

function generateFakeFarmData (index) {
  let animals_total = null
  let products_animals = null
  let animals_detail = null
  const sampledProductCategories = sampleArray(PRODUCT_CATAGORIES, Math.round(Math.random() * 5) + 1)
  const renting = Math.random() > 0.8 ? null : Math.random() > 0.5
  const share_farm = Math.random() > 0.8 ? null : Math.random() > 0.5
  const pastoral_lease = Math.random() > 0.8 ? null : Math.random() > 0.5
  const native_land_title = Math.random() > 0.8 ? null : Math.random() > 0.5

  if (sampledProductCategories.some((item) => ['pasture', 'dairy', 'rangeland', 'aquaculture'].includes(item))) {
    animals_total = Math.round(Math.random() * 1000 * Math.random()) + 8
    products_animals = sampleArray(ANIMAL_LIST, Math.round(Math.random() * 6) + 1)
    let animalAllocation = animals_total
    animals_detail = {}
    products_animals.forEach((animal) => {
      animals_detail[animal] = 1
      --animalAllocation
    })
    for (let i = 0; i < animalAllocation; i++) {
      const winner = sample(products_animals)
      animals_detail[winner] += 1
    }
  }

  const managementSample = sampleArray(MANAGEMENT_PLANS, Math.round(Math.random() * 5))
  const certificationsSample = sampleArray(FARM_CERTIFICATIONS, Math.round(Math.random() * 7))
  const managementPartitions = partition(managementSample, (el) => Math.random() > 0.5)
  const certificationsPartitions = partition(certificationsSample, (el) => Math.random() > 0.5)
  const interest = Math.random() > 0.9 ? [] : sampleArray(COLLABORATION_INTERESTS, Math.round(Math.random() * 4))
  const types = sampleArray(FARM_TYPES, Math.round(Math.random() * 2) + 1)
  const management_plans_current_detail = Math.random() > 0.92 ? null : managementPartitions[0]
  const certifications_current_detail = Math.random() > 0.92 ? null : certificationsPartitions[0]
  const product_detail = Math.random() > 0.85 ? [] : generateProducts(index)
  const open_to_public = Math.random() > 0.25
  const public_offerings = open_to_public ? sampleArray(PUBLIC_OFFERINGS, Math.round(Math.random() * 4)) : []
  const goals = Math.random() > 0.8 ? [] : sampleArray(FARM_GOALS, Math.round(Math.random() * 3) + 1)
  const location = {
    address_line1: faker.address.streetAddress(),
    postal_code: faker.address.zipCode('#####'),
    country_code: faker.address.countryCode(),
    locality: faker.address.city(),
    administrative_area: faker.address.state()
  }

  const flexible = {
    hylo: {
      at_a_glance: [sample(types), sample(management_plans_current_detail), sample(certifications_current_detail), sample(product_detail), sample(products_animals)],
      location_privacy: sampleArray(LOCATION_PRIVACY, 1),
      mission: faker.lorem.sentence(),
      opening_hours: open_to_public ? 'M-F: 9-3 \n S-S: 12-4' : null,
      open_to_public,
      public_offerings
    }
  }

  return {
    area_total_hectares: Math.random() > 0.85 ? null : Math.random() * 1000 * Math.random() + 0.1,
    animals_total,
    animals_detail,
    products_animals,
    average_annual_rainfall: Math.random() > 0.85 ? null : Math.random() * 1500 * Math.random() + 1,
    average_annual_temperature: Math.random() > 0.9 ? null : Math.random() * 24 * Math.random() + 4,
    bio: Math.random() > 0.8 ? null : faker.lorem.paragraph(),
    certifications_current_detail,
    certifications_current: 'yes',
    certifications_desired_detail: Math.random() > 0.9 ? null : certificationsPartitions[1],
    certifications_desired: 'yes',
    climate_zone: Math.random() > 0.85 ? null : sample(CLIMATE_ZONES).value,
    conditions_details: null, // left null for now
    county: Math.random() > 0.6 ? null : faker.address.county(),
    interest,
    company: Math.random() > 0.5 ? faker.random.word() + faker.random.word() + ' LLC' : null,
    equity_practices: [...new Array(Math.round(Math.random() * 6) + 1)].map((el) => 'to be implemented'),
    phone: Math.random() > 0.85 ? null : faker.phone.phoneNumber('(###) ###-####'),
    email: Math.random() > 0.85 ? null : `${faker.random.word()}@${faker.random.word()}.com`,
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    farm_leadership_experience: Math.random() > 0.85 ? null : Math.random() * 19 + 1,
    area: Math.random() > 0.6 ? null : generateFakeGeometry(),
    location_address_line1: location.address_line1,
    location_address_line2: null,
    location_locality: location.locality,
    location_country_code: location.country_code,
    location_postal_code: location.postal_code,
    location_administrative_area: location.administrative_area,
    community_outline: Math.random() > 0.7 ? null : generateFakeGeometry(0.09),
    types,
    flexible,
    goal_1: goals.length > 0 ? goals[0] : null,
    goal_2: goals.length > 1 ? goals[1] : null,
    goal_3: goals.length > 2 ? goals[2] : null,
    hardiness_zone: Math.random() > 0.9 ? null : sample(HARDINESS_ZONES),
    immediate_data_source: faker.random.word(),
    indigenous_territory: Math.random() > 0.6 ? null : [...new Array(Math.round(Math.random() * 2) + 1)].map((el) => 'to be implemented'),
    land_other: {
      rent: renting,
      share_farm,
      pastoral_lease,
      native_land_title
    },
    land_other_detail: {
      rent: Math.random() > 0.6 ? null : renting ? Math.random() * 99 + 1 : 0,
      share_farm: Math.random() > 0.8 ? null : share_farm ? Math.random() * 99 + 1: 0,
      pastoral_lease: Math.random() > 0.8 ? null : pastoral_lease ? Math.random() * 99 + 1 : 0,
      native_land_title: Math.random() > 0.8 ? null : native_land_title ? Math.random() * 99 + 1 : 0
    },
    land_type_details: Math.random() > 0.6 ? {} : allocateLandUseByProduct(sampledProductCategories),
    // mailing_address: Math.random() > 0.6 ? null : mailing_address, // removed from schema 1.0, will likely be added back
    management_plans_current: 'yes',
    management_plans_future: 'yes',
    management_plans_current_detail,
    management_plans_future_detail: Math.random() > 0.92 ? null : managementPartitions[1],
    organizational_id: faker.datatype.uuid(),
    motivations: Math.random() > 0.8 ? null : sampleArray(FARM_MOTIVATIONS, Math.round(Math.random() * 5)),
    preferred_contact_method: Math.random() > 0.8 ? null : sample(PREFERRED_CONTACT_METHODS).value,
    products_categories: sampledProductCategories,
    product_detail,
    products_value_added: Math.random() > 0.5 ? [] : [...new Array(Math.round(Math.random() * 15) + 1)].map((el) => faker.random.word()),
    records_software: null, // left null
    records_system: null, // left null
    role: null, // left null
    schema_version: '0.2',
    social: `${faker.random.word()}.com`,
    unique_id: uuidv4(),
    units: Math.random() > 0.85 ? null : Math.random() > 0.5 ? 'imperial' : 'metric',
    website: Math.random() > 0.8 ? null : `${faker.random.word()}-farm.com`
  }
}

function sampleArray (array, sampleAmount) {
  const sampledResults = {}

  for (let i = 0; i < Math.round(sampleAmount); i++) {
    sampledResults[sample(array).value] = ''
  }
  return Object.keys(sampledResults)
}

function allocateLandUseByProduct (products) {
  if (products.length === 1) return { [products[0]]: 0.9 }
  const results = {}
  let allocation = 9
  products.forEach((product) => {
    results[product] = 0.1
    allocation -= 1
  })
  while (allocation > 1) {
    if (allocation % 2 === 0) {
      allocation -= 1
    } else {
      results[sample(products)] += 0.2
      allocation -= 2
    }
  }

  return results
}

function generateProducts (index) {
  if (index === 0) return []
  const sampledProducts = sampleArray(FARM_PRODUCT_LIST, Math.round(Math.random() * 30) + 1)
  if (index % 6 === 0 && !sampledProducts.includes('apple')) sampledProducts.push('apple')
  if (index % 8 === 0 && !sampledProducts.includes('pear')) sampledProducts.push('pear')
  if (index % 13 === 0 && !sampledProducts.includes('carrots')) sampledProducts.push('carrots')
  if (index % 15 === 0 && !sampledProducts.includes('millet')) sampledProducts.push('millet')
  return sampledProducts
}

function generateFakeGeometry (sideLength = 0.002) {
  const fakeLat = faker.address.latitude(42, 38)
  const fakeLng = faker.address.longitude(-119, -122)
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                fakeLat,
                fakeLng
              ],
              [
                fakeLat + sideLength,
                fakeLng
              ],
              [
                fakeLat + sideLength,
                fakeLng + sideLength
              ],
              [
                fakeLat,
                fakeLng + sideLength
              ],
              [
                fakeLat,
                fakeLng
              ]
            ]
          ]
        },
        properties: null,
        id: 'measureFeature0'
      }
    ]
  }
}

function sampleDB (entity, where, knex, limit = 1) {
  return knex(entity)
    .where(where)
    .select()
    .orderByRaw('random()')
    .limit(limit)
}

function fakeGroupData (name, slug, created_by_id, type) {
  return {
    name,
    group_data_type: 1,
    avatar_url: `https://avatars.dicebear.com/api/bottts/${faker.random.word()}.svg`,
    access_code: faker.datatype.uuid(),
    description: faker.lorem.paragraph(),
    slug: slug,
    banner_url: 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg',
    created_at: faker.date.past(),
    created_by_id,
    location: faker.address.country(),
    visibility: 2,
    accessibility: 2,
    settings: { allow_group_invites: false, public_member_directory: false },
    slack_hook_url: faker.internet.url(),
    slack_team: faker.internet.url(),
    slack_configure_url: faker.internet.url(),
    type: type || null
  }
}

function fakeUser () {
  return Promise.resolve({
    email: `${uuidv4()}@farm-demo.com`,
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    avatar_url: `https://avatars.dicebear.com/api/open-peeps/${faker.random.word()}.svg`,
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    last_login_at: faker.date.past(),
    active: true,
    email_validated: true,
    created_at: faker.date.past(),
    bio: faker.lorem.paragraph(),
    banner_url: faker.image.imageUrl(),
    twitter_name: faker.internet.userName(),
    linkedin_url: faker.internet.url(),
    facebook_url: faker.internet.url(),
    work: faker.lorem.paragraph(),
    intention: faker.lorem.paragraph(),
    extra_info: faker.lorem.paragraph(),
    updated_at: faker.date.past(),
    location: faker.address.country(),
    url: faker.internet.url()
  })
}

function addWidgetsToGroups (knex) {
  console.info('  --> farm group_widgets')
  return knex('groups')
    .select(['id as group_id'])
    .whereRaw('groups.type = \'farm\'')
    .then(groupIds => Promise.all(
      groupIds.map(({ group_id }, index) => Promise.all(
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((widget_id) => knex('group_widgets')
          .insert({ widget_id, group_id, context: 'landing', order: widget_id, is_visible: true })
        )
      ))))
}
