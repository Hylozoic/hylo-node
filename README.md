# hylo-node

a [Sails](http://sailsjs.org) application

### setup

```shell
npm install -g forever sails
npm install
```

Create a `.env` file in the root of the working copy, with contents like this:
```
DATABASE_URL=postgres://localhost/hylo
DOMAIN=localhost:3001
EMAIL_SENDER=lawrence+dev@hylo.com
PLAY_APP_SECRET=...
PRETTY_JSON=true
SENDWITHUS_KEY=...
```
* `PLAY_APP_SECRET`: use [the one in hylo-play](https://github.com/Hylozoic/hylo-play/blob/master/conf/application.conf)
* `SENDWITHUS_KEY`: set up a test key in SendWithUs to send all email only to you

### running the dev server

```shell
forever -w app.js # optionally with --port PORT
```

The `.env` file you created above gets read automatically by the Node app, using [dotenv](http://www.npmjs.org/package/dotenv), and `forever` restarts the server when any files are updated. 

Now visit [localhost:1337](http://localhost:1337) (or whatever `PORT` is).
