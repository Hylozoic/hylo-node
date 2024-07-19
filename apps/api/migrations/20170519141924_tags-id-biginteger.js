require("@babel/register")
const FullTextSearch = require('../api/services/FullTextSearch')

exports.up = function (knex) {
  return FullTextSearch.dropView(knex)
    .then(() => knex.raw('ALTER TABLE tags ALTER COLUMN id TYPE bigint'))
    .then(() => FullTextSearch.createView(null, knex))
}

exports.down = function (knex) {
  return FullTextSearch.dropView(knex)
    .then(() => knex.raw('ALTER TABLE tags ALTER COLUMN id TYPE integer'))
    .then(() => FullTextSearch.createView(null, knex))
}
