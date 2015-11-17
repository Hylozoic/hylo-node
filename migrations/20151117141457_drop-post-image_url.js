'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('post', t => t.dropColumn('image_url')),
    knex.schema.table('post', t => t.dropColumn('thumbnail_image_url'))
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('post', t => t.string('image_url')),
    knex.schema.table('post', t => t.string('thumbnail_image_url'))
  )
}
