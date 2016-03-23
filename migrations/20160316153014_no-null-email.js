'use strict';

exports.up = function(knex, Promise) {
  return knex.raw('alter table users alter email set not null')  
};

exports.down = function(knex, Promise) {
  
};
