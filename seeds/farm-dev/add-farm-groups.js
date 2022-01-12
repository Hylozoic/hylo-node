/* eslint-disable camelcase */
const { sample, partition } = require('lodash')
const faker = require('faker')
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
  MANAGEMENT_PLANS,
  PREFERRED_CONTACT_METHODS,
  PRODUCT_CATAGORIES
} = require('../../lib/constants')
const uuid = require('node-uuid')

exports.seed = (knex) => seed('users', knex)
  .then(() => seed('groups', knex))
  .then(() => seed('posts', knex))
  .then(() => addUsersToGroups(knex))
  .then(() => addPostsToGroups(knex))
  .then(() => addFarmExtensionToGroups(knex))
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
  users: 50
}

const fake = {
  groups: fakeGroup,
  posts: fakePost,
  users: fakeUser
}

function seed (entity, knex) {
  console.info(`  --> ${entity}`)
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

function addUsersToGroups (knex) {
  console.info('  --> farm group_memberships')
  return knex('users').select('id')
    .whereRaw('users.email ILIKE \'%@farm-demo.com\'')
    .then(users => Promise.all(users.map(({ id }) => fakeMembership(id, knex))))
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
  return sampleDB('users', knex.raw('users.email ILIKE \'%@farm-demo.com\''), knex) // select only farm-demo users to create these specific posts for
    .then(([user]) => ({
      name: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      created_at: faker.date.past(),
      user_id: user.id,
      active: true
    }))
}

function addPostsToGroups (knex) {
  console.info('  --> farm groups_posts')
  return knex('posts')
    .select(['id as post_id', 'user_id'])
    .whereNull('type')
    .whereRaw('user_id in (select users.id as user_id from users where users.email ILIKE \'%@farm-demo.com\')') // select farm demo users only
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
  let animal_count = null
  let animal_types = null
  let animal_count_by_type = null
  const sampledProductCategories = sampleArray(PRODUCT_CATAGORIES, Math.round(Math.random() * 5) + 1)
  const renting = Math.random() > 0.8 ? null : Math.random() > 0.5

  if (sampledProductCategories.some((item) => ['pasture', 'dairy', 'rangeland', 'aquaculture'].includes(item))) {
    animal_count = Math.round(Math.random() * 1000 * Math.random()) + 8
    animal_types = sampleArray(ANIMAL_LIST, Math.round(Math.random() * 6) + 1)
    let animalAllocation = animal_count
    animal_count_by_type = {}
    animal_types.forEach((animal) => {
      animal_count_by_type[animal] = 1
      --animalAllocation
    })
    for (let i = 0; i < animalAllocation; i++) {
      const winner = sample(animal_types)
      animal_count_by_type[winner] += 1
    }
  }

  const managementSample = sampleArray(MANAGEMENT_PLANS, Math.round(Math.random() * 5))
  const certificationsSample = sampleArray(FARM_CERTIFICATIONS, Math.round(Math.random() * 7))
  const managementPartitions = partition(managementSample, (el) => Math.random() > 0.5)
  const certificationsPartitions = partition(certificationsSample, (el) => Math.random() > 0.5)

  return {
    acres: Math.random() > 0.85 ? null : Math.random() * 1000 * Math.random() + 1,
    animal_count,
    animal_count_by_type,
    animal_types,
    area_unit_preference: Math.random() > 0.85 ? null : Math.random() > 0.5 ? 'hectares' : 'acres',
    average_annual_rainfall: Math.random() > 0.85 ? null : Math.random() * 1500 * Math.random() + 1,
    average_annual_temperature: Math.random() > 0.9 ? null : Math.random() * 24 * Math.random() + 4,
    certifications_current: Math.random() > 0.9 ? null : certificationsPartitions[0],
    certifications_desired: Math.random() > 0.9 ? null : certificationsPartitions[1],
    climate_zone: Math.random() > 0.85 ? null : sample(CLIMATE_ZONES).value,
    collaboration_interest: Math.random() > 0.9 ? [] : sampleArray(COLLABORATION_INTERESTS, Math.round(Math.random() * 4)),
    company: Math.random() > 0.5 ? faker.random.word() + faker.random.word() + ' LLC' : null,
    equity_practices: [...new Array(Math.round(Math.random() * 6) + 1)].map((el) => 'to be implemented'),
    farm_cell_phone: Math.random() > 0.85 ? null : faker.phone.phoneNumber('(###) ###-####'),
    farm_email: Math.random() > 0.85 ? null : `${faker.random.word()}@${faker.random.word()}.com`,
    farm_leadership_experience: Math.random() > 0.85 ? null : Math.random() * 19 + 1,
    farm_management_system: null, // left null
    farmos_url: Math.random() > 0.5 ? null : `${faker.random.word()}@${faker.random.word()}.com`,
    farm_outline: Math.random() > 0.6 ? null : generateFakeGeometry(),
    farm_physical_address: `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.county()}, ${faker.address.country()}`,
    farm_types: sampleArray(FARM_TYPES, Math.round(Math.random() * 2) + 1),
    flexible: null, // leave null
    goals: Math.random() > 0.6 ? [] : sampleArray(FARM_GOALS, Math.round(Math.random() * 3) + 1),
    hardiness_zone: Math.random() > 0.9 ? null : sample(HARDINESS_ZONES),
    indigenous_territory: Math.random() > 0.6 ? null : [...new Array(Math.round(Math.random() * 2) + 1)].map((el) => 'to be implemented'),
    land_use_percentage_by_product: Math.random() > 0.6 ? {} : allocateLandUseByProduct(sampledProductCategories),
    mailing_address: Math.random() > 0.6 ? null : `${faker.address.streetAddress}, ${faker.address.city()}, ${faker.address.county()}, ${faker.address.country()}`,
    management_plans_current: Math.random() > 0.9 ? null : managementPartitions[0],
    management_plans_future: Math.random() > 0.9 ? null : managementPartitions[1],
    management_software: null,
    mission: Math.random() > 0.8 ? null : faker.lorem.paragraph(),
    motivations: Math.random() > 0.8 ? null : sampleArray(FARM_MOTIVATIONS, Math.round(Math.random() * 5)),
    preferred_contact_method: Math.random() > 0.8 ? null : sample(PREFERRED_CONTACT_METHODS).value,
    product_categories: sampledProductCategories,
    products_details: Math.random() > 0.85 ? [] : generateProducts(index),
    products_value_added: Math.random() > 0.5 ? [] : [...new Array(Math.round(Math.random() * 15) + 1)].map((el) => faker.random.word()),
    rain_unit_preference: Math.random() > 0.8 ? null : Math.random() > 0.5 ? 'inches' : 'millimeters',
    rent_acreage_percentage: Math.random() > 0.8 ? null : renting ? Math.random() * 99 + 1 : 0,
    renting,
    schema_version: '0.1',
    soil_composition: Math.random() > 0.8
      ? {}
      : {
          sandy: Math.round(Math.random() * 5),
          clay: Math.round(Math.random() * 5)
        },
    temperature_unit_preference: Math.random() > 0.5 ? 'celsius' : 'fahrenheit',
    unique_id: uuid.v4(),
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

function generateFakeGeometry () {
  const fakeLat = faker.address.latitude(-119, -122)
  const fakeLng = faker.address.longitude(42, 38)
  const sideLength = 0.002
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
    avatar_url: 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png',
    access_code: faker.random.uuid(),
    description: faker.lorem.paragraph(),
    slug: slug,
    banner_url: 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg',
    created_at: faker.date.past(),
    created_by_id,
    location: faker.address.country(),
    visibility: 1,
    accessibility: 1,
    settings: { allow_group_invites: false, public_member_directory: false },
    slack_hook_url: faker.internet.url(),
    slack_team: faker.internet.url(),
    slack_configure_url: faker.internet.url(),
    type: type || null
  }
}

function fakeUser () {
  return Promise.resolve({
    email: `${uuid.v4()}@farm-demo.com`,
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    avatar_url: faker.internet.avatar(),
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
