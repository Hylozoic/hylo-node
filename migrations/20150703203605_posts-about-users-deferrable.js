'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.raw('alter table posts_about_users alter constraint posts_about_users_post_id_foreign DEFERRABLE INITIALLY DEFERRED'),
    knex.raw('alter table posts_about_users alter constraint posts_about_users_user_id_foreign DEFERRABLE INITIALLY DEFERRED')
  );
};

exports.down = function(knex, Promise) {

};
