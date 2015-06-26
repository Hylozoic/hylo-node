var kue = require('kue'),
  Promise = require('bluebird');

module.exports = {
  addJob: function(name, data) {
    var queue = require('kue').createQueue();

    var job = queue.create(name, data)
    .delay(5000) // because the job could be queued while an object it depends upon hasn't been saved yet
    .attempts(3)
    .backoff({delay: 5000, type: 'exponential'});

    return Promise.promisify(job.save, job)();
  },

  classMethod: function(className, methodName, data) {
    var data = _.merge({
      className: className,
      methodName: methodName
    }, data);
    return this.addJob('classMethod', data);
  },

  removeOldCompletedJobs: function(size) {
    var rangeByState = Promise.promisify(kue.Job.rangeByState, kue.Job),
      now = new Date().getTime(),
      days = 7;

    var removeIfOldEnough = job => {
      if (now - Number(job.created_at) > days * 86400000) {
        return Promise.promisify(job.remove, job)().then(() => true);
      }
      return false;
    };

    return rangeByState('complete', 0, size-1, 'asc')
    .then(jobs => Promise.map(jobs, removeIfOldEnough))
    .then(results => _.filter(results).length);
  }
};