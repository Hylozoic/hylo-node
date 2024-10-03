const {
  createUpdateTrigger,
  dropUpdateTrigger
} = require('../knexfile')

exports.up = function (knex, Promise) {
  return knex.raw(createUpdateTrigger('group_memberships'))
}

exports.down = function (knex, Promise) {
  return knex.raw(dropUpdateTrigger('group_memberships'))
}
