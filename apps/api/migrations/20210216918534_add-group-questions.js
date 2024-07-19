
exports.up = async function(knex) {
  await knex.schema.createTable('questions', table => {
    table.increments().primary()
    table.text('text')
    table.timestamp('created_at')
  })

  await knex.schema.createTable('group_join_questions', table => {
    table.increments().primary()

    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.bigInteger('question_id').references('id').inTable('questions').notNullable()

    table.timestamp('created_at')
    table.timestamp('updated_at')

    table.index('group_id')
  })

  await knex.schema.createTable('join_request_question_answers', table => {
    table.increments().primary()

    table.bigInteger('question_id').references('id').inTable('questions').notNullable()
    table.bigInteger('join_request_id').references('id').inTable('join_requests').notNullable()
    table.text('answer')

    table.timestamp('created_at')
    table.timestamp('updated_at')

    table.index('join_request_id')
  })

  await knex.raw(`ALTER TABLE join_requests DROP CONSTRAINT IF EXISTS join_requests_group_id_user_id_unique`)

  return knex.schema.alterTable('join_requests', table => {
    table.bigInteger('processed_by_id').references('id').inTable('users')
  })
}

exports.down = async function(knex) {
  await knex.schema.dropTable('join_request_question_answers')
  await knex.schema.dropTable('group_join_questions')
  await knex.schema.dropTable('questions')

  return knex.schema.alterTable('join_requests', table => {
    table.dropColumn('processed_by_id')
  })
}
