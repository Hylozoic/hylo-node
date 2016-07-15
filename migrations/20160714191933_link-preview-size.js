'use strict'

exports.up = (knex, Promise) =>
  knex.schema.table('link_previews', t => {
    t.integer('image_width')
    t.integer('image_height')
  })

exports.down = (knex, Promise) =>
  knex.schema.table('link_previews', t =>
    t.dropColumns('image_width', 'image_height'))
