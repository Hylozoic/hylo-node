'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.schema.dropTable('users_user_permission'),
    knex.schema.dropTable('notification_status')
  ).then(() => Promise.join(
    knex.schema.dropTable('user_permission'),
    knex.schema.dropTable('token_action'),
    knex.schema.dropTable('device'),
    knex.schema.dropTable('notification'),
    knex.schema.dropTable('post_view'),
    knex.schema.dropTable('invite_request')
  ));
};

exports.down = function(knex, Promise) {

};
