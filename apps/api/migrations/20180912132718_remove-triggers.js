const {
    createUpdateFunction,
    dropUpdateFunction,
    createUpdateTrigger,
    dropUpdateTrigger
  } = require('../knexfile')

exports.up = function(knex, Promise) {
    return knex.raw(dropUpdateTrigger('group_memberships'))
    .then(knex.raw(dropUpdateFunction()))    
};

exports.down = function(knex, Promise) {
    return knex.raw(createUpdateTrigger('group_memberships'))
    .then(knex.raw(createUpdateFunction()))
};
