'use strict'

exports.up = function (knex, Promise) {
  return Promise.join(
    knex.raw('alter table comments_tags add constraint unique_comments_tags unique (comment_id, tag_id)'),
    knex.raw('alter table communities_tags add constraint unique_communities_tags unique (community_id, tag_id)'),
    knex.raw('alter table posts_tags add constraint unique_posts_tags unique (post_id, tag_id)'),
    knex.raw('alter table tags_users add constraint unique_tags_users unique (tag_id, user_id)')
  )
}

exports.down = function (knex, Promise) {
  return Promise.join(
    knex.raw('alter table comments_tags drop constraint unique_comments_tags'),
    knex.raw('alter table communities_tags drop constraint unique_communities_tags'),
    knex.raw('alter table posts_tags drop constraint unique_posts_tags'),
    knex.raw('alter table tags_users drop constraint unique_tags_users')
  )
}
