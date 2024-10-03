'use strict'

exports.seed = function (knex, Promise) {
  return knex('groups_posts').del()
    .then(() => knex('group_memberships').del())
    .then(() => knex('groups').del())   // Deletes ALL existing entries
    .then(() => knex('groups')
      .insert({
        id: 1,
        name: 'starter-posts',
        slug: 'starter-posts',
        avatar_url: 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png',
        banner_url: 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg',
        group_data_type: 1,
        visibility: 1,
        accessibility: 1,
        settings: { allow_group_invites: false, public_member_directory: false }
      })
  )
}
