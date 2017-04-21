const faker = require('faker')

const n = {
  communities: 50,
  networks: 5,
  posts: 3000,
  tags: 20,
  users: 1000
}

exports.seed = (knex, Promise) => delAll(knex)
  .then(() => seed('users', knex, Promise))
  .then(() => knex('tags').insert([
    {name: 'offer'},
    {name: 'request'},
    {name: 'intention'}
  ]))
  .then(() => seed('tags', knex, Promise))
  .then(() => seed('networks', knex, Promise))
  .then(() => knex('communities').insert({ name: 'starter-posts', slug: 'starter-posts' }))
  .then(() => seed('communities', knex, Promise))
  .then(() => seed('posts', knex, Promise))
  .then(() => addUsersToCommunities(knex, Promise))
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

function delAll (knex) {
  return knex('activities').del()
    .then(() => knex('tag_follows').del())
    .then(() => knex('communities_tags').del())
    .then(() => knex('communities_posts').del())
    .then(() => knex('communities_users').del())
    .then(() => knex('community_invites').del())
    .then(() => knex('comments_tags').del())
    .then(() => knex('comments').del())
    .then(() => knex('contributions').del())
    .then(() => knex('devices').del())
    .then(() => knex('event_responses').del())
    .then(() => knex('follows').del())
    .then(() => knex('join_requests').del())
    .then(() => knex('link_previews').del())
    .then(() => knex('linked_account').del())
    .then(() => knex('media').del())
    .then(() => knex('nexudus_accounts').del())
    .then(() => knex('notifications').del())
    .then(() => knex('posts_about_users').del())
    .then(() => knex('posts_tags').del())
    .then(() => knex('posts_users').del())
    .then(() => knex('push_notifications').del())
    .then(() => knex('tags_users').del())
    .then(() => knex('thanks').del())
    .then(() => knex('user_external_data').del())
    .then(() => knex('user_post_relevance').del())
    .then(() => knex('votes').del())
    .then(() => knex('posts').del())
    .then(() => knex('communities').del())
    .then(() => knex('networks').del())
    .then(() => knex('tags').del())
    .then(() => knex('users').del())
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
  return knex('users').select('id')
    .then(users => knex('communities').select('id').then(communities => ({ users, communities })))
    .then(({ users, communities }) => Promise.all(
      users.map(user => knex('communities_users').insert({
        user_id: user.id,
        community_id: communities[randomIndex(communities.length)].id,
        role: moderatorOrMember(),
        settings: '{ "send_email": true, "send_push_notifications": true }' 
      }))
    ))
}

function seed (entity, knex, Promise) {
  console.info(`  --> ${entity}`)
  return Promise.all(
    [...new Array(n[entity])]
      .map(() => fake[entity](knex, Promise).then(row => knex(entity).insert(row)))
  )
}

// Grab random row or rows from table
function sample (entity, knex, limit = 1) {
  return knex(entity)
    .select()
    .orderByRaw('random()')
    .limit(limit)
}

function fakeCommunity (knex) {
  const name = faker.random.words()

  return Promise.all([
    sample('users', knex),
    sample('networks', knex)
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
  return sample('users', knex)
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
    name: faker.internet.userName(),
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

