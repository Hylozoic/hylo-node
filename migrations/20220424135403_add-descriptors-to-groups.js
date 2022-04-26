
exports.up = function (knex) {
  return knex.schema.table('groups', table => {
    table.string('type_descriptor').defaultTo('Group')
    table.string('type_descriptor_plural').defaultTo('Groups')
    table.string('moderator_descriptor').defaultTo('Moderator')
    table.string('moderator_descriptor_plural').defaultTo('Moderators')
  })
}

exports.down = function (knex) {
  return knex.schema.table('groups', table => {
    table.dropColumn('type_descriptor')
    table.dropColumn('type_descriptor_plural')
    table.dropColumn('moderator_descriptor')
    table.dropColumn('moderator_descriptor_plural')
  })
}
