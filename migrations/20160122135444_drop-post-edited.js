'use strict'

exports.up = function(knex, Promise) {
  return knex.schema.table('post', t => t.dropColumns('edited', 'edited_timestamp'))  
}

exports.down = function(knex, Promise) {
  
}
