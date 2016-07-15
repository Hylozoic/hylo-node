'use strict'

exports.up = function (knex, Promise) {
  return knex.schema.table('post', t => t.integer('link_preview_id').references('id').inTable('link_previews'))
  .then(() => knex.raw('alter table post alter constraint post_link_preview_id_foreign deferrable initially deferred'))
}

exports.down = function (knex, Promise) {
  return knex.schema.table('post', t => t.dropColumn('link_preview_id'))
}
