# hylo-node

a [Sails](http://sailsjs.org) application

### setup

```shell
npm install -g forever sails
npm install
```

Create a `.env` file in the root of the working copy, with contents like this:
```
ADMIN_GOOGLE_CLIENT_ID=...
ADMIN_GOOGLE_CLIENT_SECRET=...
DATABASE_URL=postgres://localhost/hylo
DEBUG_SQL=false
DOMAIN=localhost:3001
EMAIL_SENDER=lawrence+dev@hylo.com
NODE_ENV=development
PLAY_APP_SECRET=...
PRETTY_JSON=true
PROTOCOL=http
ROLLBAR_SERVER_TOKEN=...
SENDWITHUS_KEY=...
```
* `ADMIN_GOOGLE_CLIENT_*`: Get these values from the [hylo-admin Google project](https://console.developers.google.com/project/hylo-admin).
* `PLAY_APP_SECRET`: use the one in hylo-play's [application.conf](https://github.com/Hylozoic/hylo-play/blob/master/conf/application.conf)
* `ROLLBAR_SERVER_TOKEN`: use the `post_server_item` token in  [Rollbar](https://rollbar.com/hylo_dev/Hylo/settings/access_tokens/)
* `SENDWITHUS_KEY`: set up a test key in SendWithUs to send all email only to you
* `DEBUG_SQL`: set to `true` if you want to output the SQL used within knex/bookshelf

### running the dev server

```shell
forever -w app.js # optionally with --port PORT
```

The `.env` file you created above gets read automatically by the Node app, using [dotenv](http://www.npmjs.org/package/dotenv), and `forever` restarts the server when any files are updated. 

Now visit [localhost:1337](http://localhost:1337) (or whatever `PORT` is).
