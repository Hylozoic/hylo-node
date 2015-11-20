'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('projects', t => {
    t.dropColumn('image_url')
    t.dropColumn('thumbnail_url')
    t.dropColumn('video_url')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.table('projects', t => {
    t.string('image_url')
    t.string('thumbnail_url')
    t.string('video_url')
  })
}
