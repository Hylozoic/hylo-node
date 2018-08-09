const merge = require('lodash/merge')
require('dotenv').load()

if (!process.env.DATABASE_URL) {
  throw new Error('process.env.DATABASE_URL must be set')
}

const url = require('url').parse(process.env.DATABASE_URL)
var user, password
if (url.auth) {
  const i = url.auth.indexOf(':')
  user = url.auth.slice(0, i)
  password = url.auth.slice(i + 1)
}

const defaults = {
  client: 'pg',
  connection: {
    host: url.hostname,
    port: url.port,
    user: user,
    password: password,
    database: url.pathname.substring(1)
  },
  migrations: {
    tableName: 'knex_migrations'
  }
}

module.exports = {
  test: defaults,
  development: defaults,
  dummy: Object.assign({}, defaults, { seeds: { directory: './seeds/dummy' } }),
  staging: defaults,
  production: merge({connection: {ssl: true}}, defaults),
  docker: Object.assign({},
    defaults,
    {
      connection: Object.assign({},
        defaults.connection,
        { user: 'hylo', password: 'hylo', port: '5300' }
      )
    }
  ),
  createUpdateTrigger: table => `
    CREATE TRIGGER ${table}_updated_at
    BEFORE UPDATE ON ${table}
    FOR EACH ROW
    EXECUTE PROCEDURE on_update_timestamp();
  `,
  dropUpdateTrigger: table => `
    DROP TRIGGER IF EXISTS ${table}_updated_at ON ${table}
  `,
  createUpdateFunction: () => `
    CREATE OR REPLACE FUNCTION on_update_timestamp()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `,
  dropUpdateFunction: () => `
    DROP FUNCTION IF EXISTS on_update_timestamp()
  `
}
