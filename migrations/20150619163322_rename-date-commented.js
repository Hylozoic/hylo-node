'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('comment', table => table.renameColumn('date_commented', 'created_at'));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('comment', table => table.renameColumn('created_at', 'date_commented'));
};
