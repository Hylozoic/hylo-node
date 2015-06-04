'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('networks', table => {
    table.increments();
    table.string('name');
    table.text('description');
    table.string('avatar_url');
    table.string('banner_url');
    table.string('slug').unique();
    table.timestamps();
  }).then(() => knex.schema.table('community', table =>
    table.bigInteger('network_id').references('id').inTable('networks')));
};

exports.down = function(knex, Promise) {
  return knex.schema.table('community', table => table.dropColumn('network_id'))
  .then(() => knex.schema.dropTable('networks'));
};
