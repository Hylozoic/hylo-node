exports.up = function (knex, Promise) {
  return Promise.join(
    knex.raw('alter table follows drop constraint uq_no_multiple_followers_2'),
    knex.raw('alter table follows add constraint unique_follows unique (post_id, comment_id, user_id)')
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.raw('alter table follows drop constraint unique_follows'),
    knex.raw('alter table follows add constraint uq_no_multiple_followers_2 unique (post_id, user_id)')
  )
}
