const environment = process.env.NODE_ENV || 'development'
const config = require('../../knexfile')[environment]
const knex = require('knex')(config)
const fs = require('fs')
const path = require('path')

console.info('Attempting to remove outdated migration filenames from database...')
const migrations = fs.readdirSync(path.join(__dirname, '..'))
  .filter(f => f.slice(-3) === '.js')
knex('knex_migrations')
  .whereNotIn('name', migrations)
  .del()
  .then(n => console.info(`...${n} rows affected.`))
  .then(() => knex.destroy())
  .catch(console.error)
