
exports.up = async function(knex) {
  await knex.schema.createTable('group_questions', table => {
    table.increments().primary()

    table.bigInteger('group_id').references('id').inTable('groups').notNullable()
    table.text('text')

    table.timestamp('created_at')
    table.timestamp('updated_at')

    table.index('group_id')
  })

  await knex.schema.createTable('group_question_answers', table => {
    table.increments().primary()

    table.bigInteger('group_question_id').references('id').inTable('group_questions').notNullable()
    table.bigInteger('user_id').references('id').inTable('users').notNullable()
    table.text('answer')

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.raw(`ALTER TABLE join_requests DROP CONSTRAINT IF EXISTS join_requests_group_id_user_id_unique`)

  return knex.schema.alterTable('join_requests', table => {
    table.bigInteger('processed_by_id').references('id').inTable('users')
  })
}

exports.down = async function(knex) {
  await knex.schema.dropTable('group_question_answers')
  await knex.schema.dropTable('group_questions')

  return knex.schema.alterTable('join_requests', table => {
    table.dropColumn('processed_by_id')
  })
}
