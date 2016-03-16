### hi!

Thanks for checking out our code. The documentation below may be incomplete or incorrect. We welcome pull requests! But we're a very small team, so we can't guarantee timely responses.

:heart:, [Edward](https://github.com/edwardwest), [Ray](https://github.com/razorman8669), [Lawrence](https://github.com/levity), [Minda](https://github.com/Minda), & [Robbie](https://github.com/robbiecarlton)

[![Code Climate](https://codeclimate.com/github/Hylozoic/hylo-node/badges/gpa.svg)](https://codeclimate.com/github/Hylozoic/hylo-node) [![Test Coverage](https://codeclimate.com/github/Hylozoic/hylo-node/badges/coverage.svg)](https://codeclimate.com/github/Hylozoic/hylo-node/coverage)

### setup

You need to install redis locally, then follow the steps to launch it on startup:
```shell
brew install redis
```

next install the node modules
```shell
npm install -g forever sails foreman
npm install
```

Create a `.env` file in the root of the working copy, with contents like this:
```
ADMIN_GOOGLE_CLIENT_ID=foo
ADMIN_GOOGLE_CLIENT_SECRET=foo
ASSET_HOST_URL=http://localhost:1337
BUNDLE_VERSION=dev
DATABASE_URL=postgres://postgres:password@localhost:5432/hylo
DEBUG_SQL=false
DOMAIN=localhost:3001
EMAIL_SENDER=dev+localtester@hylo.com
GOOGLE_CLIENT_ID=foo
GOOGLE_CLIENT_SECRET=foo
FACEBOOK_APP_ID=foo
FACEBOOK_APP_SECRET=foo
KISS_AUTH_TOKEN=foo
KISS_AUTH_COMMUNITY_ID=9
LINKEDIN_API_KEY=foo
LINKEDIN_API_SECRET=foo
MAILGUN_DOMAIN=mg.hylo.com
MAILGUN_EMAIL_SALT=FX988194AD22EE636
NODE_ENV=development
PLAY_APP_SECRET=foo
PRETTY_JSON=true
PROTOCOL=http
REDIS_URL=redis://localhost:6379
ROLLBAR_SERVER_TOKEN=foo
SEGMENT_KEY=foo
SENDWITHUS_KEY=foo
SLACK_APP_CLIENT_ID=xxxxxxx
SLACK_APP_CLIENT_SECRET=xxxxxxxx
```
* `ADMIN_GOOGLE_CLIENT_*`: To access the admin console.  Get these values from the [hylo-admin Google project](https://console.developers.google.com/project/hylo-admin).
* `ASSET_HOST_URL`: The host for static assets. In development, this is the [hylo-frontend](https://github.com/Hylozoic/hylo-frontend) server, which listens at `localhost:1337` by default.
* `DEBUG_SQL`: set to `true` if you want to output the SQL used within knex/bookshelf
* `DATABASE_URL`: set to your local DB instance
* `PLAY_APP_SECRET`: set to a string over length 16 to avoid the code erroring. real value only needed for running in production environment
* `ROLLBAR_SERVER_TOKEN`: use the `post_server_item` token in  [Rollbar](https://rollbar.com/hylo_dev/Hylo/settings/access_tokens/)
* `SENDWITHUS_KEY`: set up a test key in SendWithUs to send all email only to you (ask someone with admin rights to set this up)
* `SLACK_APP_CLIENT_ID`: set up an app on Slack and reference its' client id, optional for dev installation
* `SLACK_APP_CLIENT_SECRET`: reference the client secret from that same app on Slack, optional for dev installation

### running the dev server

```shell
npm run dev
```

This reads the `.env` file you created above, using [dotenv](http://www.npmjs.org/package/dotenv), and starts two processes managed by `foreman`: one web server process and one background job worker process, as listed in `Procfile.dev`.

Now visit [localhost:3001](http://localhost:3001).

### creating and running database migrations

Migrations are managed by the [knex](http://knexjs.org) library. Create a new migration with this command:

```shell
knex migrate:make my_migration_name
```

(You can either install knex globally with `npm install -g knex`, or run the version in your `node_modules` with `./node_modules/.bin/knex`.)

Run migrations with `npm run migrate` and rollback the last one with `npm run rollback`.

### initializing the database schema

This is only necessary if you aren't going to be loading a database snapshot. If you just want to set up a fresh instance, with nothing in the database, you have to run
```shell
cat migrations/schema.sql | psql [your-database-name]
```

### loading database snapshots

The values of `DB_USERNAME`, `DB_HOST`, `DB_PORT`, and `DB_NAME` below can be obtained from `DATABASE_URL` in `heroku config`.

```shell
LOCAL_DB_NAME=hylo
DUMP_FILENAME=dbdump
pg_dump -O -U $DB_USERNAME -h $DB_HOST -p $DB_PORT $DB_NAME > $DUMP_FILENAME
# stop all processes that have open database connections, then:
dropdb $LOCAL_DB_NAME -h localhost
createdb $LOCAL_DB_NAME -h localhost
cat $DUMP_FILENAME | psql -h localhost $LOCAL_DB_NAME
```

### design guidelines

* GET methods on `FooController` should return instances of `Foo`. (See policies.js for some related FIXME's)

### style guidelines

We're gradually migrating to [Javascript Standard Style](https://github.com/feross/standard).

The [standard-formatter Atom package](https://atom.io/packages/standard-formatter) helps out a lot. We deviate from its default behavior only in not indenting a multi-line method chain:

```javascript
# yes
return Do(() => {
  amaze()
  very()
})
.then(such)
.tap(wow)

# no
return Do(() => {
  amaze()
  very()
})
  .then(such)
  .tap(wow)
```

The [linter-js-standard](https://atom.io/packages/linter-js-standard) package is also very helpful.

## License

    Hylo is a mobile and web application to help people do more together. 
    Hylo helps communities better understand who in their community has what skills, 
    and how they can create things together.
    Copyright (C) 2016, Hylozoic, Inc.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
