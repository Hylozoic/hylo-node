# hylo-node

a [Sails](http://sailsjs.org) application

### setup

```shell
npm install -g forever sails
npm install
echo "export PLAY_APP_SECRET=..." > .env
```

(get the Play app secret from [application.conf](https://github.com/Hylozoic/hylo-play/blob/master/conf/application.conf))

### running the dev server
```shell
source .env; forever -w app.js # optionally with --port PORT
```

`forever` restarts the server when any files are updated. Now visit [localhost:1337](http://localhost:1337) (or whatever `PORT` is).
