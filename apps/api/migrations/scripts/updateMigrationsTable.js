const environment = process.env.NODE_ENV || 'development'
const config = require('../../knexfile')[environment]
const knex = require('knex')(config)
const fs = require('fs')
const path = require('path')

process.stdout.write('Attempting to remove outdated migration filenames from database... ')
const migrations = fs.readdirSync(path.join(__dirname, '..'))
.filter(f => f.slice(-3) === '.js')

var newestMigrationTime

if (migrations.length > 0) {
  const timestamp = migrations[migrations.length - 1].split('_')[0]
  newestMigrationTime = new Date(
    timestamp.substring(0, 4),
    Number(timestamp.substring(4, 6)) - 1,
    timestamp.substring(6, 8),
    timestamp.substring(8, 10),
    timestamp.substring(10, 12),
    timestamp.substring(12, 14)
  )
} else {
  newestMigrationTime = new Date()
}

knex('knex_migrations')
.whereNotIn('name', migrations)
.where('migration_time', '<', newestMigrationTime)
.del()
.then(n => console.info(`${n} rows affected.`))
.catch(console.error)
.finally(() => knex.destroy())
