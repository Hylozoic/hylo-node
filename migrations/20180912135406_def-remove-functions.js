const {
    createUpdateFunction,
    dropUpdateFunction
  } = require('../knexfile')

exports.up = function(knex, Promise) {
    return knex.raw(dropUpdateFunction())
};

exports.down = function(knex, Promise) {
    return knex.raw(createUpdateFunction())
};
