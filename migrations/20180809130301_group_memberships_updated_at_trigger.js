const { onUpdateTrigger, onDropTrigger } = require('../knexfile')

exports.up = function (knex, Promise) {
  knex.raw(onUpdateTrigger('group_memberships'))
}

exports.down = function (knex, Promise) {
  knex.raw(onDropTrigger('group_memberships'))
}
