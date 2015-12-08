'use strict'

exports.up = function(knex, Promise) {
  return knex.schema.raw('alter table projects alter id type bigint')  
}

exports.down = function(knex, Promise) {
  return knex.schema.raw('alter table projects alter id type int')  
}
