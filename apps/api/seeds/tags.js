'use strict'

exports.seed = function (knex, Promise) {
  return knex('tags').del()
    .then(() => knex('tags').insert([
      {name: 'offer'},
      {name: 'request'},
      {name: 'intention'},
      {name: 'general'}
    ]))
}
