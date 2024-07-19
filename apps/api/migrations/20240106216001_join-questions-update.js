
exports.up = async function (knex, Promise) {
  await knex.schema.renameTable('join_request_question_answers', 'group_join_questions_answers')

  await knex.schema.alterTable('group_join_questions_answers', async (table) => {
    table.bigInteger('group_id').references('id').inTable('groups')
    table.bigInteger('user_id').references('id').inTable('users')
    // Make join_request_id nullable since we wont be requiring it anymore
    table.bigInteger('join_request_id').nullable().alter()
  })

  await knex.raw('alter table group_join_questions_answers alter constraint group_join_questions_answers_user_id_foreign deferrable initially deferred')
  await knex.raw('alter table group_join_questions_answers alter constraint group_join_questions_answers_group_id_foreign deferrable initially deferred')

  await knex.raw("update group_memberships set settings = jsonb_set(settings, '{joinQuestionsAnsweredAt}', to_jsonb(created_at))")

  // Directly connect join question answers to the group and user instead of to a join request
  return knex.raw('update group_join_questions_answers set group_id = join_requests.group_id, user_id = join_requests.user_id from join_requests where join_requests.id = group_join_questions_answers.join_request_id')
}

exports.down = async function (knex, Promise) {
  await knex.schema.alterTable('group_join_questions_answers', async (table) => {
    table.dropColumn('group_id')
    table.dropColumn('user_id')
    // table.bigInteger('join_request_id').notNullable().alter() XXX: we can just leave as nullable, instead of deleting null rows
  })

  await knex.schema.renameTable('group_join_questions_answers', 'join_request_question_answers')
}
