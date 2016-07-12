'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.createTable('link_previews', table => {
    table.increments().primary()
    table.string('url').unique()
    table.boolean('done').defaultTo(false)
    table.text('title')
    table.text('description')
    table.string('image_url')
    table.timestamps()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('link_previews')
}
