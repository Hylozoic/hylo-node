const {
  onUpdateTrigger,
  onDropTrigger,
  createUpdateTrigger
} = require('../knexfile')

exports.up = function (knex, Promise) {
  knex.raw(createUpdateTrigger())
  knex.raw(onUpdateTrigger('group_memberships'))
}

exports.down = function (knex, Promise) {
  knex.raw(onDropTrigger('group_memberships'))
}
