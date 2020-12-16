const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')

exports.seed = function (knex) {
  return knex('knex_migrations').del()
    .then(() => {
      const files = fs.readdirSync(path.join(__dirname, '..', 'migrations'))
      return addMigrations(knex, files.filter(f => f.slice(-3) === '.js'))
    })
}

// Add all migrations in directory to knex_migrations (any .js file in the
// directory is assumed to be a migration).
function addMigrations (knex, migrations) {
  return Promise.reduce(
    migrations,
    (_, name) => knex('knex_migrations').insert({
      name,
      batch: 1,
      migration_time: knex.fn.now()
    }),
    []
  )
}
