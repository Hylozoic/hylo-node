/* eslint-disable camelcase */
import { map, sample, partition } from 'lodash'
import faker from 'faker'
import { sample as sampleDB, fakeUser, fakeGroupData } from './dummy/dummy'
import {
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
} from '../lib/constants'
import uuid from 'node-uuid'

exports.seed = (knex) => () => seed('users', knex)
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
  users: 32
}

const fake = {
  groups: fakeGroup,
  posts: fakePost,
  users: wrappedFakeUser
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

function wrappedFakeUser () {
  return () => {
    const email = `${uuid.v4()}@farm-demo.com`
    return fakeUser(email)
  }
}

function addPostsToGroups (knex) {
  console.info('  --> farm groups_posts')
  return knex('posts')
    .select(['id as post_id', 'user_id'])
    .whereNull('type')
    .whereRaw('user_id in (select users.id as user_id from users where users.email ILIKE \'%@farm-demo.com\'') // select farm demo users only
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
          knex('group_extensions')
            .insert({ extension_id: id, group_id, active: true, created_at: timestamp, updated_at: timestamp, data: generateFakeFarmData(index) })
        })
      )))
}

function generateFakeFarmData (index) {
  const renting = Math.random() > 0.5
  const animal_count = Math.random() * 1000 * Math.random() + 1 // TODO: base this all on whether the right farm type exists

  const managementSample = sampleArray(MANAGEMENT_PLANS, Math.round(Math.random() * 5))
  const certificationsSample = sampleArray(FARM_CERTIFICATIONS, Math.round(Math.random() * 7))
  const managementPartitions = partition(managementSample, (el) => Math.random() > 0.5)
  const certificationsPartitions = partition(certificationsSample, (el) => Math.random() > 0.5)

  return {
    acres: Math.random() * 1000 * Math.random() + 1,
    animal_count,// TODO: base this all on whether the right farm type exists
    animal_count_by_type: null,// TODO: base this all on whether the right farm type exists
    animal_types: null,// TODO: base this all on whether the right farm type exists
    area_unit_preference: Math.random() > 0.5 ? 'hectares' : 'acres',
    average_annual_rainfall: Math.random() * 1500 * Math.random() + 1,
    average_annual_temperature: Math.random() * 24 * Math.random() + 4,
    certifications_current: null,
    certifications_desired: null,
    climate_zone: sample(CLIMATE_ZONES)["value"],
    collaboration_interest: sampleArray(COLLABORATION_INTERESTS, Math.round(Math.random() * 4)),
    company: Math.random() > 0.5 ? faker.random.word() + faker.random.word() + ' LLC' : null,
    equity_practices: [...new Array(Math.round(Math.random() * 6) + 1)]map((el) => 'to be implemented'),
    farm_cell_phone: faker.phone.phoneNumber('(###) ###-####'),
    farm_email: `${faker.random.word()}@${faker.random.word()}.com`,
    farm_leadership_experience: Math.random() * 19 + 1,
    farm_management_system: null,
    farmos_url: `${faker.random.word()}@${faker.random.word()}.com`,
    farm_outline: null, // TODO: am I going to fake some geometries??
    farm_physical_address: `${faker.address.streetAddress}, ${faker.address.city()}, ${faker.address.county()}, ${faker.address.country()}`,
    farm_types: sampleArray(FARM_TYPES, Math.round(Math.random() * 2) + 1),
    flexible: null, // leave null
    goals: sampleArray(FARM_GOALS, Math.round(Math.random() * 3) + 1),
    hardiness_zone: sample(HARDINESS_ZONES),
    indigenous_territory: [...new Array(Math.round(Math.random() * 2) + 1)]map((el) => 'to be implemented'),
    land_use_percentage_by_product: null, // TODO: create function to allocate percentage between products
    mailing_address: `${faker.address.streetAddress}, ${faker.address.city()}, ${faker.address.county()}, ${faker.address.country()}`,
    management_plans_current: null, // TODO: sample larger list of management plan and then randomly split between these two
    management_plans_future: null,
    management_software: null,
    mission: faker.lorem.paragraph(),
    motivations: sampleArray(FARM_MOTIVATIONS, Math.round(Math.random() * 5)),
    preferred_contact_method: sample(PREFERRED_CONTACT_METHODS)["value"],
    product_categories: sampleArray(PRODUCT_CATAGORIES, Math.round(Math.random() * 5) + 1),
    products_details: generateProducts(index),
    products_value_added: [...new Array(Math.round(Math.random() * 15) + 1)]map((el) => faker.random.word()),
    rain_unit_preference: Math.random() > 0.5 ? 'inches' : 'millimeters',
    rent_acreage_percentage: renting ? Math.random() * 99 + 1 : 0,
    renting,
    schema_version: '0.1',
    soil_composition: {
      sandy: Math.round(Math.random() * 5), 
      clay: Math.round(Math.random() * 5),
    },
    temperature_unit_preference: Math.random() > 0.5 ? 'celsius' : 'fahrenheit',
    unique_id: uuid.v4(),
    website: `${faker.random.word()}-farm.com`
  }
}

function sampleArray (array, sampleAmount){
  const sampledResults = {}

  for (let i = 0; i < Math.round(sampleAmount); i++){
    sampledResults[sample(array)["value"]] = ''
  }
  return Object.keys(sampledResults)
}

function generateProducts(index){
  // sample of bunch of products
  // based on index, add some specific products to ensure we have some healthy overlap
  // based on zero index, add empty array

}
