'use strict'

exports.seed = function (knex, Promise) {
  return knex('groups_posts').del()
    .then(() => knex('group_memberships').del())
    .then(() => knex('groups').del())   // Deletes ALL existing entries
    .then(() => knex('groups')
                    .insert({id: 1, name: 'starter-posts', slug: 'starter-posts'})
  )
}
