### hi!

Thanks for checking out our code. The documentation below may be incomplete or incorrect. We welcome pull requests! But we're a very small team, so we can't guarantee timely responses.

:heart:, [Edward](https://github.com/edwardwest), [Ray](https://github.com/razorman8669), [Lawrence](https://github.com/levity), [Minda](https://github.com/Minda), [Robbie](https://github.com/robbiecarlton), & [Connor](https://github.com/connoropolous)

[![Code Climate](https://codeclimate.com/github/Hylozoic/hylo-node/badges/gpa.svg)](https://codeclimate.com/github/Hylozoic/hylo-node) [![Test Coverage](https://codeclimate.com/github/Hylozoic/hylo-node/badges/coverage.svg)](https://codeclimate.com/github/Hylozoic/hylo-node/coverage)

### setup

You need to install redis locally, then follow the steps to launch it on startup (on the default port of 6379). For OSX/MacOS:

```shell
brew install redis
```

Arch Linux:

```shell
pacman -S redis
systemctl enable redis.service
systemctl start redis.service
```

Ubuntu Linux:

```shell
sudo apt-get -y install redis-server
sudo systemctl enable redis
sudo systemctl start redis
```

Next install the node modules (and Yarn, if you don't already have it available):

```shell
npm install -g forever sails foreman yarn
yarn install
```

Create a `.env` file in the root directory. Values in square brackets are team specific and should be supplied:

```
COOKIE_NAME=[ any string without spaces ]
COOKIE_SECRET=[ any string without spaces ]
DEBUG_SQL=true
DOMAIN=localhost:3001
EMAIL_SENDER=[ email ]
ROLLBAR_SERVER_TOKEN=[ token ]
FACEBOOK_APP_ID=[ app id ]
FACEBOOK_APP_SECRET=[ app secret ]
GOOGLE_CLIENT_ID=[ client id ]
GOOGLE_CLIENT_SECRET=[ client secret ]
LINKEDIN_API_KEY=[ api key ]
LINKEDIN_API_SECRET=[ api secret ]
MAILGUN_DOMAIN=[ domain ]
MAILGUN_EMAIL_SALT=[ salt ]
NEW_RELIC_LICENSE_KEY_DISABLED=[ key ]
NODE_ENV=development
PLAY_APP_SECRET=[ app secret ]
AWS_S3_BUCKET=[ bucket name ]
AWS_SECRET_ACCESS_KEY=[ secret access key ]
AWS_ACCESS_KEY_ID=[ access key id ]
PRETTY_JSON=true
PROTOCOL=http
REDIS_URL=redis://0.0.0.0:6379
SEGMENT_KEY=[ key ]
SENDWITHUS_KEY=[ key ]
DATABASE_URL=postgres://localhost:5432/hylo
SLACK_APP_CLIENT_ID=[ client id ]
SLACK_APP_CLIENT_SECRET=[ client secret ]
ADMIN_GOOGLE_CLIENT_ID=[ client id ]
ADMIN_GOOGLE_CLIENT_SECRET=[ client secret ]
UPLOADER_HOST=[ hostname ]
UPLOADER_PATH_PREFIX=[ path ]
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

### populating the database

If a local Postgres server is running and your user has create database privileges, you should be able to:

```shell
createdb hylo -h localhost
createdb hylo_test -h localhost
cat migrations/schema.sql | psql hylo
./node_modules/.bin/knex seed:run
```

This is only necessary if you're creating a fresh instance and aren't going to be loading a database snapshot (see below for that process). If you're new, you can also use the dummy seed to truncate everything and populate a bunch of fake data including a test account login like so:

```shell
NODE_ENV=dummy npm run knex seed:run
```

*This will trash everything in your current `hylo` database, so make sure you really want to do that!* The script will ask for confirmation. By default the test user will be `test@hylo.com` with password `hylo`, configurable at the top of `seeds/dummy/dummy.js`.


### running the dev server

```shell
npm run dev
```

This reads the `.env` file you created above, using [dotenv](http://www.npmjs.org/package/dotenv), and starts two processes managed by `foreman`: one web server process and one background job worker process, as listed in `Procfile.dev`. If you want to run only one of the processes, pass its name in `Procfile.dev` as an argument, e.g. `npm run dev -- web`.

Now visit [localhost:3001](http://localhost:3001).

### running tests

Run `npm test` or `npm run cover`. The tests should use a different database (see below), because it creates and drops the database schema on each run.

Create a file called `.env.test` to set environment variables for the test environment.

```
# NOTE: don't put comments after a variable initialization.  it will break your tests!

# run tests against a different database
DATABASE_URL=postgres://localhost/hylo_test
DOMAIN=testdomain
# this prevents jobs that were queued during testing from being run in development
KUE_NAMESPACE=qtest
PROTOCOL=http
# don't log errors to Rollbar
ROLLBAR_SERVER_TOKEN=
# you can set up a SendWithUs API key to return valid responses but send no email
SENDWITHUS_KEY=test_...
MAILGUN_EMAIL_SALT=FFFFAAAA123456789
MAILGUN_DOMAIN=mg.hylo.com
PLAY_APP_SECRET=quxgrault12345678
AWS_ACCESS_KEY_ID=foo
UPLOADER_PATH_PREFIX=foo
```


(Without the above Mailgun values, you'll see a failing test in the suite.) Since the test database was created above, `npm test` should work at this point.

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

### style guidelines

We're gradually migrating to [Javascript Standard Style](https://github.com/feross/standard).

The [standard-formatter Atom package](https://atom.io/packages/standard-formatter) helps out a lot. We deviate from its default behavior only in not indenting a multi-line method chain:

```javascript
// yes
return Do(() => {
  amaze()
  very()
})
.then(such)
.tap(wow)

// no
return Do(() => {
  amaze()
  very()
})
  .then(such)
  .tap(wow)
```

The [linter-js-standard](https://atom.io/packages/linter-js-standard) package is also very helpful.

## GraphQL API

Many queries can also be issued using the newer GraphQL API. Types available:

```
Comment
Community
FeedItem
Follower
Me
Membership
Person
Post
```

Queries:

```
type Query {
  me: Me
  person(id: ID): Person
  community(id: ID, slug: String): Community
}
```

where `Me` is the currently logged-in user. For example, to load all posts:

```
{
  me {
    posts {
      id,
      title,
      type,
      details,
      creator {
        id,
        name,
        avatarUrl
      }
      followers {
        id,
        name,
        avatarUrl
      }
      followersTotal,
      communities {
        id,
        name
      },
      communitiesTotal,
      comments {
        id,
        createdAt,
        text,
        creator {
          id
        }
      },
      commentsTotal,
      createdAt,
      startsAt,
      endsAt,
      fulfilledAt
    }
  }
}
```

## License

    Hylo is a mobile and web application to help people do more together.
    Hylo helps communities better understand who in their community has what skills,
    and how they can create things together.
    Copyright (C) 2017, Hylozoic, Inc.

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
