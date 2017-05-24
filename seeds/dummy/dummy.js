const bcrypt = require('bcrypt')
const faker = require('faker')
const promisify = require('bluebird').promisify
const hash = promisify(bcrypt.hash, bcrypt)
const readline = require('readline')

const n = {
  communities: 50,
  posts: 1000,
  tags: 20,
  users: 1000,
  threads: 100
}

// Add your test account details here. You'll be randomly assigned to a community,
// and you'll also be added to the one specified below.
// (You can create your own later if you want).
const name = 'Test Account'
const email = 'test@hylo.com'
const password = 'hylo'
const community = 'Test Community'
const communitySlug = 'test'
let provider_user_id = ''

function warning () {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve, reject) => {
    rl.question(`
      WARNING: Running the dummy seed will COMPLETELY WIPE anything you cared about
      in the database. If you're sure that's what you want, type 'yes'. Anything else
      will result in this script terminating.

    `, answer => {
      if (answer !== 'yes') {
        console.log('Exiting.')
        process.exit()
      }
      console.log('\nOk, you asked for it...\n')
      rl.close()
      return resolve()
    })
  })
}

exports.seed = (knex, Promise) => warning()
  .then(() => truncateAll(knex))
  .then(() => seed('users', knex, Promise))
  .then(() => hash(password, 10))
  .then(hash => { provider_user_id = hash })
  .then(() => knex('users')
    .insert({
      name,
      email,
      active: true,
      avatar_url: faker.internet.avatar(),
      email_validated: true,
      created_at: knex.fn.now()
    })
    .returning('id'))
  .then(([ user_id ]) => knex('linked_account')
    .insert({
      user_id,
      provider_user_id, 
      provider_key: 'password'
    }))
  .then(() => knex('tags').insert([
    {name: 'offer'},
    {name: 'request'},
    {name: 'intention'}
  ]))
  .then(() => seed('tags', knex, Promise))
  .then(() => knex('communities').insert({ name: 'starter-posts', slug: 'starter-posts' }))
  .then(() => knex('communities').insert({ name: community, slug: communitySlug }))
  .then(() => seed('communities', knex, Promise))
  .then(() => seed('posts', knex, Promise))
  .then(() => Promise.all([
    knex('users').where('email', email).first('id'),
    knex('communities').where('slug', communitySlug).first('id')
  ]))
  .then(([ user, community ]) => knex('communities_users').insert({
    active: true,
    user_id: user.id,
    community_id: community.id,
    created_at: knex.fn.now(),
    role: 1,
    settings: '{ "send_email": true, "send_push_notifications": true }'
  }))
  .then(() => addUsersToCommunities(knex, Promise))
  .then(() => createThreads(knex, Promise))
  .then(() => seedMessages(knex, Promise))
  .then(() => addPostsToCommunities(knex, Promise))
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

function truncateAll (knex) {
  return knex.raw('TRUNCATE TABLE users CASCADE')
    .then(() => knex.raw('TRUNCATE TABLE tags CASCADE'))
}

const fake = {
  communities: fakeCommunity,
  networks: fakeNetwork,
  posts: fakePost,
  tags: fakeTag,
  users: fakeUser
}

function randomIndex (length) {
  return Math.floor(Math.random() * length)
}

function moderatorOrMember () {
  // Role 1 is moderator
  return Math.random() > 0.9 ? 1 : 0
}

function addUsersToCommunities (knex, Promise) {
  console.info('  --> communities_users')
  return knex('users').select('id')
    .then(users => Promise.all(users.map(({ id }) => fakeMembership(id, knex))))
}

function addPostsToCommunities (knex, Promise) {
  console.info('  --> communities_posts')
  return knex('posts')
    .select([ 'id as post_id', 'user_id' ])
    .whereNull('type')
    .then(posts => Promise.all(
      posts.map(({ post_id, user_id }) => knex('communities_users')
        .where('communities_users.user_id', user_id)
        .first('community_id')
        .then(({ community_id }) => knex('communities_posts')
          .insert({ post_id, community_id }))
      )))
}

function seed (entity, knex, Promise) {
  console.info(`  --> ${entity}`)
  return Promise.all(
    [ ...new Array(n[entity]) ].map(
      () => fake[entity](knex, Promise).then(row => knex(entity).insert(row))
    )
  )
}

function createThreads (knex, Promise) {
  console.info('  --> threads')
  return knex('communities').where('slug', communitySlug).first('id')
    .then(community => Promise.all(
      [ ...new Array(n.threads) ].map(() => fakeThread(community.id, knex, Promise))
    ))
}

function seedMessages (knex, Promise) {
  console.info('  --> messages')
  return knex('follows')
    .join('posts', 'posts.id', 'follows.post_id')
    .select('follows.post_id as post', 'follows.user_id as user')
    .where('posts.type', 'thread')
    .then(follows => Promise.all(
      // Add five messages to each followed thread
      [ ...follows, ...follows, ...follows, ...follows, ...follows ]
        .map(follow => knex('comments')
        .insert({
          text: faker.lorem.paragraph(),
          created_at: faker.date.past(),
          post_id: follow.post,
          user_id: follow.user,
          active: true
        }))
      )
    )
}

// Grab random row or rows from table
function sample (entity, where, knex, limit = 1) {
  return knex(entity)
    .where(where)
    .select()
    .orderByRaw('random()')
    .limit(limit)
}

function fakeThread (communityId, knex, Promise) {
  const whereInCommunity = knex.raw(`
    users.id IN (
      SELECT user_id FROM communities_users
      WHERE community_id = ${communityId}
    )
  `)

  const randomUsers = sample('users', whereInCommunity, knex, randomIndex(5) + 2)
  return randomUsers
    .then(users => knex('posts')
      .insert({
        created_at: faker.date.past(),
        type: 'thread',
        user_id: users[0].id,
        active: true
      })
      .returning(['id', 'user_id']))
    .then(([ post ]) => Promise.all(
      randomUsers.map(user =>
        knex('follows').insert({
          post_id: post.id,
          user_id: user.id,
          added_at: faker.date.past()
        })
        .returning('user_id'))
    ))
}

function fakeCommunity (knex) {
  const name = faker.random.words()

  return Promise.all([
    sample('users', true, knex),
    sample('networks', true, knex)
  ])
    .then(([ users, networks ]) => ({
      name,
      avatar_url: faker.internet.avatar(),
      background_url: faker.image.imageUrl(),
      beta_access_code: faker.random.uuid(),
      description: faker.lorem.paragraph(),
      slug: faker.helpers.slugify(name).toLowerCase(),
      daily_digest: faker.random.boolean(),
      membership_fee: faker.random.number(),
      plan_guid: faker.random.uuid(),
      banner_url: faker.internet.url(),
      category: faker.random.uuid(),
      created_at: faker.date.past(),
      created_by_id: users[0].id,
      leader_id: users[0].id,
      welcome_message: faker.lorem.paragraph(),
      network_id: networks[0].id,
      location: faker.address.country(),
      slack_hook_url: faker.internet.url(),
      slack_team: faker.internet.url(),
      slack_configure_url: faker.internet.url()
    }))
}

function fakeMembership (user_id, knex) {
  return sample('communities', true, knex)
    .then(([ community ]) => knex('communities_users')
      .insert({
        active: true,
        community_id: community.id,
        created_at: knex.fn.now(),
        role: moderatorOrMember(),
        settings: '{ "send_email": true, "send_push_notifications": true }',
        user_id
      }))
}

function fakeNetwork (_, Promise) {
  const name = faker.random.words()
  const past = faker.date.past()

  return Promise.resolve({
    name,
    description: faker.lorem.paragraph(),
    avatar_url: faker.internet.avatar(),
    banner_url: faker.image.imageUrl(),
    slug: faker.helpers.slugify(name).toLowerCase(),
    created_at: past,
    updated_at: past
  })
}

function fakePost (knex, Promise) {
  return sample('users', true, knex)
    .then(([ user ]) => ({
      name: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      created_at: faker.date.past(),
      user_id: user.id,
      active: true
    }))
}

function fakeTag (_, Promise) {
  const past = faker.date.past()

  return Promise.resolve({
    name: faker.random.word().split(' ')[0].toLowerCase(),
    created_at: past,
    updated_at: past
  })
}

function fakeUser (_, Promise) {
  return Promise.resolve({
    email: faker.internet.email(),
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
