'use strict';

exports.up = function(knex, Promise) {
  return knex.raw('alter table projects drop constraint projects_slug_unique');
};

exports.down = function(knex, Promise) {
  
};
