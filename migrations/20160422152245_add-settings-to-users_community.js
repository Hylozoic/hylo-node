'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('users_community', table => {
    table.json('settings')
  })
  .then(() => knex.schema.raw("ALTER TABLE users_community ALTER COLUMN settings DROP DEFAULT, ALTER COLUMN settings TYPE jsonb using settings::text::jsonb, ALTER COLUMN settings SET DEFAULT '{}'::jsonb;"))
}
exports.down = function (knex, Promise) {
  return knex.schema.table('users_community', table => {
    table.dropColumn('settings')
  })
}
