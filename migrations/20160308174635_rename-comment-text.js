'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('comment', t => t.renameColumn('comment_text', 'text'))  
};

exports.down = function(knex, Promise) {
  return knex.schema.table('comment', t => t.renameColumn('text', 'comment_text'))  
};
