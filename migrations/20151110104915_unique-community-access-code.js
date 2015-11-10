'use strict';

exports.up = function(knex, Promise) {
  return knex.raw('alter table community add constraint unique_beta_access_code unique (beta_access_code)')
};

exports.down = function(knex, Promise) {
  return knex.raw('alter table community drop constraint unique_beta_access_code')
};
