'use strict'

exports.up = function (knex, Promise) {
  return knex.raw('alter table link_previews alter image_url type text')
}

exports.down = function (knex, Promise) {
  return knex.raw('alter table link_previews alter image_url type character varying(255)')
}
