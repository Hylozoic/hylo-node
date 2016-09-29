'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('nexudus_accounts', t => {
    t.increments()
    t.bigInteger('community_id').references('id').inTable('community')
    t.string('space_id')
    t.string('username')
    t.string('password')
    t.boolean('autoupdate')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('nexudus_accounts')
}
