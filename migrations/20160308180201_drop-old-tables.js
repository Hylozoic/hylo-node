'use strict';

exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('org'),
    knex.schema.dropTable('skill')
  ])
};

exports.down = function(knex, Promise) {
  
};
