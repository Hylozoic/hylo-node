
exports.up = function(knex, Promise) {
  return knex.schema.createTable('event_invitations', table => {
    table.increments().primary()
    table.bigInteger('user_id').references('id').inTable('users')
    table.bigInteger('inviter_id').references('id').inTable('users')
    table.bigInteger('event_id').references('id').inTable('posts')    
    table.string('response')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('event_invitations')
}
