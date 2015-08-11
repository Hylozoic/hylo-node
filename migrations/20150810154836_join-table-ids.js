'use strict';

exports.up = function(knex, Promise) {
  return knex.raw('alter table users_community drop constraint pk_users_community')
  .then(() => knex.raw('alter table users_community add constraint user_community_unique unique (user_id, community_id)'))
  .then(() => knex.raw('alter table post_community drop constraint pk_post_community'))
  .then(() => knex.raw('alter table post_community add constraint post_community_unique unique (post_id, community_id)'))
  .then(() => Promise.join(
    knex.schema.table('users_community', table => table.increments().primary()),
    knex.schema.table('post_community', table => table.increments().primary())
  ));
};

exports.down = function(knex, Promise) {
  return Promise.join(
    knex.schema.table('users_community', table => table.dropColumn('id')),
    knex.schema.table('post_community', table => table.dropColumn('id'))
  );
};
