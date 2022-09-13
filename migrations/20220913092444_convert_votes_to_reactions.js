
exports.up = async function (knex) {
  await knex.schema.renameTable('votes', 'reactions')

  await knex.schema.table('reactions', table => {
    table.text('emoji_base')
    table.text('emoji_full')
    table.text('emoji_label')
    table.text('entity_type')
    table.renameColumn('post_id', 'entity_id')
    table.renameColumn('date_voted', 'date_reacted')
    table.index('emoji_base', 'idx_reactions_emoji_full')
    table.index('entity_type', 'idx_reactions_entity_type')
    table.dropIndex('ix_vote_post_14')
    table.index('entity_id', 'idx_reactions_entity_id')
  })

  // migrate prior data
  // 'U+1F44D' but encoded in UTF-16 (because javascript) => '\uD83D\uDC4D', thumbs up emoji, :thumbs up:
  await knex('reactions').update({
    emoji_base: '\uD83D\uDC4D',
    emoji_full: '\uD83D\uDC4D',
    entity_type: 'post',
    emoji_label: ':thumbs up:'
  })

  await knex.schema.table('posts', table => {
    table.jsonb('reactions')
    table.renameColumn('num_votes', 'num_reactions')
  })
}

exports.down = async function (knex) {
  await knex.schema.table('reactions', table => {
    table.dropColumn('geo_shape')
    table.dropColumn('emoji_base')
    table.dropColumn('emoji_full')
    table.dropColumn('emoji_label')
    table.dropColumn('entity_type')
    table.renameColumn('entity_id', 'post_id')

    table.dropIndex('idx_reactions_emoji_full')
    table.dropIndex('idx_reactions_entity_type')
    table.index('post_id', 'ix_vote_post_14')
    table.dropIndex('idx_reactions_entity_id')
  })

  await knex.schema.table('posts', table => {
    table.dropColumn('reactions')
    table.renameColumn('num_reactions', 'num_votes')
    table.renameColumn('date_reacted', 'date_voted')
  })

  await knex.schema.renameTable('reactions', 'votes')
}
