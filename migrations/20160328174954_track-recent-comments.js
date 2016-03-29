'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('comment', t => t.boolean('recent'))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('comment', t => t.dropColumn('recent'))
};
