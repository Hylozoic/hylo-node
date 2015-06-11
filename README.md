### hi!

Thanks for checking out our code. The documentation below may be incomplete or incorrect. We welcome pull requests! But we're a very small team, so we can't guarantee timely responses.

<3, [Edward](https://github.com/edwardwest), [Ray](https://github.com/razorman8669), [Lawrence](https://github.com/levity), [Minda](https://github.com/Minda), & [Robbie](https://github.com/robbiecarlton)

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
```
* `ADMIN_GOOGLE_CLIENT_*`: To access the admin console.  Get these values from the [hylo-admin Google project](https://console.developers.google.com/project/hylo-admin).
* `ASSET_HOST_URL`: The host for static assets. In development, this is the [hylo-frontend](https://github.com/Hylozoic/hylo-frontend) server, which listens at `localhost:1337` by default.
* `DEBUG_SQL`: set to `true` if you want to output the SQL used within knex/bookshelf
* `DATABASE_URL`: set to your local DB instance
* `ROLLBAR_SERVER_TOKEN`: use the `post_server_item` token in  [Rollbar](https://rollbar.com/hylo_dev/Hylo/settings/access_tokens/)
* `SENDWITHUS_KEY`: set up a test key in SendWithUs to send all email only to you (ask someone with admin rights to set this up)

### running the dev server

```shell
npm run dev
```

This reads the `.env` file you created above, using [dotenv](http://www.npmjs.org/package/dotenv), and starts two processes managed by `foreman`: one web server process and one background job worker process, as listed in `Procfile.dev`.

Now visit [localhost:1337](http://localhost:3001).

### creating and running database migrations

Migrations are managed by the [knex](http://knexjs.org) library. Create a new migration with this command:

```shell
knex migrate:make my_migration_name
```

(You can either install knex globally with `npm install -g knex`, or run the version in your `node_modules` with `./node_modules/.bin/knex`.)

Run migrations with `npm run migrate` and rollback the last one with `npm run rollback`.

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

### (un)license

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to http://unlicense.org/
