'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('user_post_relevance', table => {
    table.dropColumn('updated_date');
    table.timestamps();
  })
};

exports.down = function(knex, Promise) {

};
