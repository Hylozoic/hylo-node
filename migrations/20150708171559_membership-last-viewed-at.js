'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users_community', table => {
    table.renameColumn('date_joined', 'created_at');
    table.datetime('last_viewed_at');
    table.dropColumn('fee', 'subscription_guid', 'next_invoice_date');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('users_community', table => {
    table.renameColumn('created_at', 'date_joined');
    table.dropColumn('last_viewed_at');
  });
};
