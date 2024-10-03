
exports.up = async function(knex) {
  await knex.schema.table('posts', t => {
    t.timestamp('edited_at')
  })

  await knex.schema.table('comments', t => {
    t.timestamp('edited_at')
  })
}

exports.down = async function(knex) {
  await knex.schema.table('posts', t => {
    t.dropColumn('edited_at')
  })

  await knex.schema.table('comments', t => {
    t.dropColumn('edited_at')
  })
}
