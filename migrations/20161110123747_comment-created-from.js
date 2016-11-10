
exports.up = function(knex, Promise) {
  return knex.schema.table('comment', t => t.string('created_from'))  
};

exports.down = function(knex, Promise) {
  return knex.schema.table('comment', t => t.dropColumn('created_from')) 
};
