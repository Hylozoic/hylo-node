
exports.up = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.timestamp('start_time')
    table.timestamp('end_time')    
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('posts', table => {
    table.dropColumn('start_time')
    table.dropColumn('end_time')    
  })
};
