const {
  createUpdateTrigger,
  dropUpdateTrigger,
  createUpdateFunction
} = require('../knexfile')

exports.up = function (knex, Promise) {
  knex.raw(createUpdateFunction())
  knex.raw(createUpdateTrigger('group_memberships'))
}

exports.down = function (knex, Promise) {
  knex.raw(dropUpdateTrigger('group_memberships'))
}
