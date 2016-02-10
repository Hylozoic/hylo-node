'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.text('slack_hook');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumns('slack_hook');
  }); 
};
