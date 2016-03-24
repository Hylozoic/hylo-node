var kue = require('kue')
var Promise = require('bluebird')
var promisify = Promise.promisify
var rangeByState = promisify(kue.Job.rangeByState, kue.Job)

module.exports = {
  addJob: function (name, data) {
    var queue = require('kue').createQueue()

    var job = queue.create(name, data)
    .delay(5000) // because the job could be queued while an object it depends upon hasn't been saved yet
    .attempts(3)
    .backoff({delay: 20000, type: 'exponential'})

    return promisify(job.save, job)()
  },

  classMethod: function (className, methodName, data) {
    data = _.merge({
      className: className,
      methodName: methodName
    }, data)
    return this.addJob('classMethod', data)
  },

  removeOldCompletedJobs: function (size, days) {
    var now = new Date().getTime()
    if (!days) days = 3

    var removeIfOldEnough = job => {
      if (now - Number(job.created_at) > days * 86400000) {
        return promisify(job.remove, job)().then(() => true)
      }
      return false
    }

    return rangeByState('complete', 0, size - 1, 'asc')
    .then(jobs => Promise.map(jobs, removeIfOldEnough))
    .then(results => _.filter(results).length)
  }
}
