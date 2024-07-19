exports.up = function (knex) {
  return knex('users').whereRaw(`settings->>'stream_sort_by' = 'votes'`).update('settings', knex.raw(`jsonb_set(settings, '{stream_sort_by}', '"reactions"', true)::jsonb`), true)
}

exports.down = function (knex) {
  return knex('users').whereRaw(`settings->>'stream_sort_by' = 'reactions'`).update('settings', knex.raw(`jsonb_set(settings, '{stream_sort_by}', '"votes"', true)::jsonb`), true)
}
