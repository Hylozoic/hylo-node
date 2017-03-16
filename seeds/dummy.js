const faker = require('faker')

const n = {
  communities: 50
}

exports.seed = knex => delAll(knex)
  .then(() => seedCommunities(knex))
  .catch(console.error)

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
    .then(() => knex('networks').del())
    .then(() => knex('nexudus_accounts').del())
    .then(() => knex('notifications').del())
    .then(() => knex('posts_about_users').del())
    .then(() => knex('posts_tags').del())
    .then(() => knex('posts_users').del())
    .then(() => knex('posts').del())
    .then(() => knex('push_notifications').del())
    .then(() => knex('tags_users').del())
    .then(() => knex('tags').del())
    .then(() => knex('thanks').del())
    .then(() => knex('user_external_data').del())
    .then(() => knex('user_post_relevance').del())
    .then(() => knex('communities').del())
    .then(() => knex('users').del())
    .then(() => knex('votes').del())
}

// Needs foreign keys:
//  - created_by_id
//  - leader_id
//  - network_id
function fakeCommunity () {
  return {
    name: faker.helpers.slugify(faker.name.findName()).toLowerCase(),
    avatar_url: faker.internet.avatar(),
    background_url: faker.image.imageUrl(),
    beta_access_code: faker.random.uuid(),
    description: faker.lorem.paragraph(),
    slug: faker.lorem.sentence(),
    daily_digest: faker.random.boolean(),
    membership_fee: faker.random.number(),
    plan_guid: faker.random.uuid(),
    banner_url: faker.internet.url(),
    category: faker.random.uuid(),
    created_at: faker.date.past(),
    welcome_message: faker.lorem.paragraph(),
    location: faker.address.country(),
    slack_hook_url: faker.internet.url(),
    slack_team: faker.internet.url(),
    slack_configure_url: faker.internet.url()
  }
}

function seedCommunities (knex) {
  return knex('communities').insert(
    [...new Array(n.communities)].map(() => fakeCommunity())
  )
}

//exports.seed = function (knex, Promise) {
  //return knex('tags').del()
    //.then(() => knex('tags').insert([
      //{id: 1, name: 'offer'},
      //{id: 2, name: 'request'},
      //{id: 3, name: 'intention'}
    //]))
//}
