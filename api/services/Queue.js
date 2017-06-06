import { filter, merge } from 'lodash'
const kue = require('kue')
const Promise = require('bluebird')
const promisify = Promise.promisify
const rangeByState = promisify(kue.Job.rangeByState, kue.Job)
const redisUrlParser = require('parse-redis-url')()
const Sails = require('sails').constructor

module.exports = {
  addJob: function (name, data, delay = 2000) {
    var queue = require('kue').createQueue()

    // there's a delay here because the job could be queued while an object it
    // depends upon hasn't been saved yet; but this can and should be avoided
    var job = queue.create(name, data)
    .delay(delay)
    .attempts(3)
    .backoff({delay: 20000, type: 'exponential'})

    return promisify(job.save, job)()
  },

  classMethod: function (className, methodName, data, delay = 2000) {
    data = merge({className, methodName}, data)
    return this.addJob('classMethod', data, delay)
  },

  removeOldJobs: function (state, size, days = 3) {
    const now = new Date().getTime()
    const removeIfOldEnough = job => {
      if (now - Number(job.created_at) > days * 86400000) {
        return promisify(job.remove, job)().then(() => true)
      }
      return false
    }

    return rangeByState(state, 0, size - 1, 'asc')
    .then(jobs => Promise.map(jobs, removeIfOldEnough))
    .then(results => filter(results).length)
  },

  // just for development use
  clearAllPendingJobs: () =>
    Promise.map(['active', 'inactive', 'failed', 'delayed'], state =>
      Queue.removeOldJobs(state, 10000, 0)),

  // Sometimes a job running on a worker process requires a stripped-down sails
  // object after the web process request has finished. Options passed in will
  // take precedence: the default just provides sockets.
  getSailsInstance: function (overrideConfig) {
    return new Promise((resolve, reject) => {
      const redisInfo = redisUrlParser.parse(process.env.REDIS_URL)
      const defaultConfig = {
        globals: false,
        hooks: {
          // Only load sockets, and http (required for sockets)
          blueprints: false,
          controllers: false,
          cors: false,
          csrf: false,
          grunt: false,
          i18n: false,
          logger: false,
          orm: false,
          policies: false,
          pubsub: false,
          request: false,
          responses: false,
          session: false,
          services: false,
          userconfig: false,
          userhooks: false,
          views: false
        },
        sockets: {
          adapter: 'socket.io-redis',
          host: redisInfo.host,
          port: redisInfo.port,
          db: redisInfo.database,
          pass: redisInfo.password
        }
      }
      const options = Object.assign({}, defaultConfig, overrideConfig)
      const sails = new Sails()
      sails.load(options, err => {
        if (err) {
          return reject(new Error('Could not load Sails in worker process.'))
        }
        resolve(sails)
      })
    })
  }
}
