
exports.up = async function (knex) {
  await knex.schema.alterTable('groups', table => {
    table.string('type_descriptor').defaultTo(null).alter()
    table.string('type_descriptor_plural').defaultTo(null).alter()
    table.string('moderator_descriptor').defaultTo(null).alter()
    table.string('moderator_descriptor_plural').defaultTo(null).alter()
  })

  return knex('groups').update({
    type_descriptor: null,
    type_descriptor_plural: null,
    moderator_descriptor: null,
    moderator_descriptor_plural: null
  })
}

exports.down = function (knex) {
}
