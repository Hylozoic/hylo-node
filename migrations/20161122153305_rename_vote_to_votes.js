exports.up = function (knex, Promise) {
  return knex.schema.renameTable('vote', 'votes')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('votes', 'vote')
}
