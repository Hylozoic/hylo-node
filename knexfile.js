// Update with your config settings.

require('dotenv').load();

if (!process.env.DATABASE_URL) throw 'DATABASE_URL is not set';

var url = require('url').parse(process.env.DATABASE_URL), user, password;
if (url.auth) {
  var i = url.auth.indexOf(':');
  user = url.auth.slice(0, i);
  password = url.auth.slice(i + 1);
}

var defaults = {
  client: 'pg',
  connection: {
    host: url.hostname,
    port: url.port,
    user: user,
    password: password,
    database: url.path.substring(1)
  },
  migrations: {
    tableName: 'knex_migrations'
  }
};

module.exports = {

  test: {
    client: 'sqlite',
    connection: {
      filename: ':memory:'
    }
  },

  development: defaults,

  staging: defaults,

  production: defaults

};
