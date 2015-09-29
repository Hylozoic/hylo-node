'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', t => t.dropColumn('allow_public_content'))
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', t => t.boolean('allow_public_content'))
};
