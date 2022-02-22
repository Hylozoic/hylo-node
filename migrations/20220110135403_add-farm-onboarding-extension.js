
exports.up = function (knex) {
  return knex.raw(`
    INSERT INTO extensions(type, created_at) VALUES ('farm-onboarding', current_timestamp)
  `)
}

exports.down = function (knex) {
  return knex.raw(`
    DELETE FROM extensions
    WHERE type = 'farm-onboarding'
  `)
}
