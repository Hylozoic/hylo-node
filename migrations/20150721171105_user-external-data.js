'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('user_external_data', table => {
    table.bigIncrements();
    table.bigInteger('user_id').references('id').inTable('users');
    table.string('type');
    table.json('data', true);
    table.timestamps();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('user_external_data');
};
