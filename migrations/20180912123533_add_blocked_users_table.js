exports.up = function (knex, Promise) {
    return knex.schema.createTable('blocked_users', table => {
      table.increments().primary()
      table.bigInteger('user_id').references('id').inTable('users')
      table.bigInteger('blocked_user_id').references('id').inTable('users')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
  
  exports.down = function (knex, Promise) {
    return knex.schema.dropTable('blocked_users') 
  }
  