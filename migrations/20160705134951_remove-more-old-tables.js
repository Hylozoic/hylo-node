'use strict'

exports.up = (knex, Promise) => {
  const tables = ['tours', 'websites', 'phones', 'emails', 'posts_projects', 'projects']
  return knex.transaction(trx => {
    return trx.schema.table('media', table => table.dropColumn('project_id'))
    .then(() => tables.reduce(
      (pr, table) => pr.then(() => trx.schema.dropTable(table)),
      Promise.resolve())
    )
  })
}

exports.down = function (knex, Promise) {}
