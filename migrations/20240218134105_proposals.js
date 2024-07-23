exports.up = async function (knex, Promise) {
  await knex.schema.table('posts', table => {
    table.bigInteger('quorum')
    table.text('proposal_status').index()
    table.text('proposal_outcome').index()
    table.text('proposal_type')
    table.integer('proposal_vote_limit')
    table.boolean('proposal_strict').defaultTo(false)
    /*
      added proposal_ prefix to status and outcome because they are very generic column names
      and I don't want to confuse future developers as to why they are largely null
    */
    table.text('anonymous_voting')
  })

  await knex.schema.createTable('proposal_options', table => {
    table.increments().primary()
    table.bigInteger('post_id').references('id').inTable('posts').notNullable()
    table.text('emoji')
    table.text('color')
    table.text('text').notNullable()
  })

  await knex.schema.createTable('proposal_votes', table => {
    table.increments().primary()
    table.bigInteger('post_id').references('id').inTable('posts').notNullable()
    table.bigInteger('option_id').references('id').inTable('proposal_options').notNullable()
    table.bigInteger('user_id').references('id').inTable('users').notNullable()
    table.timestamp('created_at')
  })

  await knex.raw('alter table proposal_options DROP CONSTRAINT IF EXISTS proposal_options_post_id_foreign')
  await knex.raw('alter table proposal_votes alter constraint proposal_votes_post_id_foreign deferrable initially deferred')
  await knex.raw('alter table proposal_votes alter constraint proposal_votes_option_id_foreign deferrable initially deferred')
  await knex.raw('alter table proposal_votes alter constraint proposal_votes_user_id_foreign deferrable initially deferred')
}

exports.down = async function (knex, Promise) {
  await knex.schema.dropTable('proposal_votes')
  await knex.schema.dropTable('proposal_options')

  await knex.schema.table('posts', table => {
    table.dropIndex(['proposal_status'])
    table.dropIndex(['proposal_outcome'])
    table.dropColumn('quorum')
    table.dropColumn('proposal_status')
    table.dropColumn('proposal_strict')
    table.dropColumn('proposal_type')
    table.dropColumn('proposal_outcome')
    table.dropColumn('anonymous_voting')
    table.dropColumn('proposal_vote_limit')
  })
}
