
exports.up = async function(knex) {
  await knex.schema.table('posts', function (table) {
    table.renameColumn('proposal_type', 'voting_method')
  })
}

exports.down = async function(knex) {
  await knex.schema.table('posts', function (table) {
    table.renameColumn('voting_method', 'proposal_type')
  })
}
