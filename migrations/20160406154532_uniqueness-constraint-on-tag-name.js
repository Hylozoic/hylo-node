'use strict'

exports.up = function (knex, Promise) {
  return knex.raw('alter table tags add constraint unique_name unique (name)')
}

exports.down = function (knex, Promise) {
  return knex.raw('alter table community drop constraint unique_name')
}
