'use strict';

exports.up = function(knex, Promise) {
  return Promise.join(
    knex.schema.raw('alter table community alter name set not null'),
    knex.schema.raw('alter table community alter slug set not null'),
    knex.schema.raw('alter table community alter daily_digest set default true')
  )
};

exports.down = function(knex, Promise) {
  return Promise.join(
    knex.schema.raw('alter table community alter name drop not null'),
    knex.schema.raw('alter table community alter slug drop not null'),
    knex.schema.raw('alter table community alter daily_digest drop default')
  );
};
