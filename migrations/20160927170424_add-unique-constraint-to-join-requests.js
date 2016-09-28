'use strict'

exports.up = function (knex, Promise) {
  return knex.raw('alter table join_requests add constraint unique_join_requests unique (user_id, community_id)')
}

exports.down = function (knex, Promise) {
  knex.raw('alter table projects_users drop constraint join_requests')
}
