'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.string('token').unique;
  });    
};

exports.down = function(knex, Promise) {
  return knex.schema.table('devices', function(table) {
    table.dropColumn('token');
  });  
};
