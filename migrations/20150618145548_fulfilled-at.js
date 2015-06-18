'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('post', table => {
    table.renameColumn('date_fulfilled', 'fulfilled_at');
    table.dropColumn('fulfilled');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('post', table => table.renameColumn('fulfilled_at', 'date_fulfilled'));
};
