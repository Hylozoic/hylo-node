'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.raw('alter table community alter created_at type timestamp')
};

exports.down = function(knex, Promise) {
  return knex.schema.raw('alter table community alter created_at type date')
};
