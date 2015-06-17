'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.schema.table('users', table => table.renameColumn('date_created', 'created_at')),
    knex.schema.table('community', table => table.renameColumn('date_created', 'created_at')),
    knex.schema.table('post', table => table.renameColumn('creation_date', 'created_at')),
    knex.schema.table('post', table => table.renameColumn('last_updated', 'updated_at'))
  );
};

exports.down = function(knex, Promise) {
  return Promise.join(
    knex.schema.table('users', table => table.renameColumn('created_at', 'date_created')),
    knex.schema.table('community', table => table.renameColumn('created_at', 'date_created')),
    knex.schema.table('post', table => table.renameColumn('created_at', 'creation_date')),
    knex.schema.table('post', table => table.renameColumn('updated_at', 'last_updated'))
  );
};
