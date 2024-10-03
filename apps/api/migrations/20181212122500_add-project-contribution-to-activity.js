
exports.up = function(knex, Promise) {
  return knex.schema.table('activities', table => {
    table.bigInteger('project_contribution_id').references('id').inTable('project_contributions')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('activities', table => {
    table.dropColumn('project_contribution_id')    
  })
};
