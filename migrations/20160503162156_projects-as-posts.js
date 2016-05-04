'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('post', t => {
    t.bigInteger('parent_post_id').references('id').inTable('post')
  })
  .then(() => knex.schema.table('follower', t => {
    t.integer('role')
  }))
  .then(() => knex.schema.table('project_invitations', t => {
    t.bigInteger('post_id').references('id').inTable('post')
  }))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('post', t => {
    t.dropColumn('parent_post_id')
  })
  .then(() => knex.schema.table('follower', t => {
    t.dropColumn('role')
  }))
  .then(() => knex.schema.table('project_invitations', t => {
    t.dropColumn('post_id').references('id').inTable('post')
  }))
}
