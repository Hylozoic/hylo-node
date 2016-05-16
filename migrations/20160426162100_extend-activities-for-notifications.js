'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('activity', table => {
    table.bigInteger('community_id').references('id').inTable('community')
    table.json('meta')
  })
  .then(() => knex.schema.raw("ALTER TABLE activity ALTER COLUMN meta DROP DEFAULT, ALTER COLUMN meta TYPE jsonb using meta::text::jsonb, ALTER COLUMN meta SET DEFAULT '{}'::jsonb;"))
}
exports.down = function (knex, Promise) {
  return knex.schema.table('activity', table => {
    table.dropColumn('meta')
    table.dropColumn('community_id')
  })
}
