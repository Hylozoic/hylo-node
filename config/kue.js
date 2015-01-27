var kue = require('kue');

// get redis connection options from env
var redisInfo = require('parse-redis-url')().parse(process.env.REDIS_URL);

// kue's expected options are a little non-standard:
// https://github.com/learnboost/kue#redis-connection-settings
redisInfo.auth = redisInfo.password;
redisInfo.db = redisInfo.database;

kue.createQueue({
  redis: redisInfo
});

// TODO set up monitoring UI
// module.exports = {
//   http: {
//     customMiddleware: function(app) {
//       app.use('/admin/kue', kue.app);
//     }
//   }
// };