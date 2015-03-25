# hylo-node

a [Sails](http://sailsjs.org) application

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
ADMIN_GOOGLE_CLIENT_ID=...
ADMIN_GOOGLE_CLIENT_SECRET=...
AWS_S3_CONTENT_URL=http://hylo-staging.s3.amazonaws.com
BUNDLE_VERSION=44e3344d
DATABASE_URL=postgres://postgres:password@localhost:5432/hylo
DEBUG_SQL=false
DOMAIN=localhost:3001
EMAIL_SENDER=dev+localtester@hylo.com
KISS_AUTH_TOKEN=foo
KISS_AUTH_COMMUNITY_ID=9
LINKEDIN_API_KEY=751j8q86zcd83c
LINKEDIN_API_SECRET=10jc5HIFq5QS1Ij3
MAILGUN_DOMAIN=mg.hylo.com
MAILGUN_EMAIL_SALT=FX988194AD22EE636
NEW_RELIC_LICENSE_KEY_DISABLED=ca3a46107243dea4e082cdd4702e056d1910c9f8
NODE_ENV=development
PLAY_APP_SECRET=5qX69G/e3ZJ29qIeaEpJKQuJYr3MHOe52EFmRNGVOqfW8VAxUwSKUg
PRETTY_JSON=true
PROTOCOL=http
REDIS_URL=redis://localhost:6379
ROLLBAR_SERVER_TOKEN=...
SEGMENT_KEY=x21s22l2gt
SENDWITHUS_KEY=test_4333d54e6bdc840048adb031dee00e77898aceb1
```
* `ADMIN_GOOGLE_CLIENT_*`: To access the admin console.  Get these values from the [hylo-admin Google project](https://console.developers.google.com/project/hylo-admin).
* `PLAY_APP_SECRET`: use the one in hylo-play's [application.conf](https://github.com/Hylozoic/hylo-play/blob/master/conf/application.conf)
* `ROLLBAR_SERVER_TOKEN`: use the `post_server_item` token in  [Rollbar](https://rollbar.com/hylo_dev/Hylo/settings/access_tokens/)
* `SENDWITHUS_KEY`: set up a test key in SendWithUs to send all email only to you (ask someone with admin rights to set this up)
* `DEBUG_SQL`: set to `true` if you want to output the SQL used within knex/bookshelf
* `DATABASE_URL`: set to your local DB instance

### running the dev server

```shell
npm run dev
```

The `.env` file you created above gets read automatically by the Node app, using [dotenv](http://www.npmjs.org/package/dotenv), and `forever` restarts the server when any files are updated.

Now visit [localhost:1337](http://localhost:1337).
