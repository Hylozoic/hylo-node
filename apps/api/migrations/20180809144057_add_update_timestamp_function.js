const {
  createUpdateFunction,
  dropUpdateFunction
} = require('../knexfile')

exports.up = function (knex, Promise) {
  return knex.raw(createUpdateFunction())
}

exports.down = function (knex, Promise) {
  return knex.raw(dropUpdateFunction())
}
