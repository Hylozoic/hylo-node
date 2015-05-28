'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.raw('alter table projects_users add constraint unique_projects_users unique (user_id, project_id)'),
    knex.raw('alter table posts_projects add constraint unique_posts_projects unique (post_id, project_id)')
  );
};

exports.down = function(knex, Promise) {
  return Promise.join(
    knex.raw('alter table projects_users drop constraint unique_projects_users'),
    knex.raw('alter table posts_projects drop constraint unique_posts_projects')
  )
};
