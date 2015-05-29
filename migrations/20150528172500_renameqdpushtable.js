'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.renameTable('queued_pushes', 'push_notifications');
};

exports.down = function(knex, Promise) {
  return knex.schema.renameTable('push_notifications', 'queued_pushes');
};
