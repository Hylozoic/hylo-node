
exports.up = async function(knex, Promise) {
  await knex.schema.table('join_requests', table => {
    table.integer('status');
    table.index(['community_id', 'status'])
  })

  const now = new Date().toISOString()
  await knex.raw(`UPDATE "join_requests" set status = 2, updated_at = '${now}'`)
};
  
exports.down = async function(knex, Promise) {
  await knex.schema.table('join_requests', table => {
    table.dropIndex(['community_id', 'status'])
    table.dropColumn('status')
  })

  const now = new Date().toISOString()
  await knex.raw(`UPDATE "join_requests" set updated_at = '${now}'`)
};
  