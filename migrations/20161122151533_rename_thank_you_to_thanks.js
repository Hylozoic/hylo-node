exports.up = function (knex, Promise) {
  return knex.schema.renameTable('thank_you', 'thanks')
}

exports.down = function (knex, Promise) {
  return knex.schema.renameTable('thanks', 'thank_you')
}
