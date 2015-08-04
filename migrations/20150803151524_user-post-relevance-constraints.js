'use strict';

exports.up = function(knex, Promise) {
  return knex.raw('alter table user_post_relevance add constraint user_id_post_id_unique unique (user_id, post_id)');
};

exports.down = function(knex, Promise) {
  return knex.raw('alter table user_post_relevance drop constraint user_id_post_id_unique');
};
