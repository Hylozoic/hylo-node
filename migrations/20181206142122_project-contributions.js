exports.up = function (knex, Promise) {
  return knex.schema.createTable('project_contributions', table => {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('post_id').references('id').inTable('posts')    
    table.integer('amount')
    table.timestamps()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('project_contributions')
}
