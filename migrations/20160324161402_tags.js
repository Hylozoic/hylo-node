'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('tags', function (table) {
    table.increments()
    table.string('name').notNullable()
    table.text('description')
    table.bigInteger('owner_id').references('id').inTable('users')
    table.timestamps()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('tags')
}
