
exports.up = async function (knex, Promise) {
  await knex.raw(`update users set settings = jsonb_set(settings, '{post_notifications}', '"important"')`)
}

exports.down = async function (knex, Promise) {
}
