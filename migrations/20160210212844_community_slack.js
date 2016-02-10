'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.text('slack_hook');
    table.text('slack_team');
    table.text('slack_configure');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', function(table) {
    table.dropColumns('slack_hook');
    table.dropColumns('slack_team');
    table.dropColumns('slack_configure');
  });
};
