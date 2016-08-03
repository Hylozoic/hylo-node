'use strict'

exports.seed = function (knex, Promise) {
  return knex('post_community').del()
    .then(() => knex('users_community').del())
    .then(() => knex('communities_tags').del())
    .then(() => knex('tag_follows').del())
    .then(() => knex('community').del())   // Deletes ALL existing entries
    .then(() => knex('community')
                    .insert({id: 1, name: 'starter-posts', slug: 'starter-posts'})
  )
}
