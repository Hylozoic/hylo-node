'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.raw("ALTER TABLE community ALTER COLUMN settings DROP DEFAULT, ALTER COLUMN settings TYPE jsonb using settings::text::jsonb, ALTER COLUMN settings SET DEFAULT '{}'::jsonb;")
};

exports.down = function(knex, Promise) {
  return knex.schema.raw("ALTER TABLE community ALTER COLUMN settings DROP DEFAULT, ALTER COLUMN settings TYPE json using settings::text::json, ALTER COLUMN settings SET DEFAULT '{}'::json;")
};
