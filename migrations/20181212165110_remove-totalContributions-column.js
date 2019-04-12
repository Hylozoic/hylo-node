
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.dropColumn('total_contributions')    
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.integer('total_contributions').defaultTo(0)    
  })
};
