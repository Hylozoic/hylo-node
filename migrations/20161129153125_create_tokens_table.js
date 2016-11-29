'use strict'

exports.up = function(knex, Promise) {
  return knex.schema.createTable('tokens', function (table) {
    table.increments()
    table.bigInteger('user_id').references('id').inTable('users')
    table.text('token')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('tokens') 
};
