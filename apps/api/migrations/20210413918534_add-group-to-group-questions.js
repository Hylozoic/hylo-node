
exports.up = async function(knex) {
  await knex.schema.createTable('group_to_group_join_questions', table => {
    table.increments().primary()

    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('question_id').references('id').inTable('questions').notNullable()

    table.timestamp('created_at')
    table.timestamp('updated_at')

    table.index('group_id')
  })

  await knex.schema.createTable('group_to_group_join_request_question_answers', table => {
    table.increments().primary()

    table.bigInteger('question_id').references('id').inTable('questions').notNullable()
    table.bigInteger('join_request_id').references('id').inTable('group_relationship_invites').notNullable()
    table.text('answer')

    table.timestamp('created_at')
    table.timestamp('updated_at')

    table.index('join_request_id')
  })

}

exports.down = async function(knex) {
  await knex.schema.dropTable('group_to_group_join_questions')
  await knex.schema.dropTable('group_to_group_join_request_question_answers')
}
