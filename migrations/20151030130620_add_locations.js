'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('projects', table => {
      table.string('location')
    }),
    knex.schema.table('post', table => {
      table.string('location')
    }),
    knex.schema.table('community', table => {
      table.string('location')
    })
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.schema.table('projects', table => {
      table.dropColumn('location')
    }),
    knex.schema.table('post', table => {
      table.dropColumn('location')
    }),
    knex.schema.table('community', table => {
      table.dropColumn('location')
    })
  )
}
