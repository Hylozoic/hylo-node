'use strict'

exports.seed = function (knex, Promise) {
  return knex('communities_posts').del()
    .then(() => knex('communities_users').del())
    .then(() => knex('communities').del())   // Deletes ALL existing entries
    .then(() => knex('communities')
      .insert({name: 'starter-posts', slug: 'starter-posts'}))
}
