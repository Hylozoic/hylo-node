var Promise = require('bluebird');

module.exports = {
  addJob: function(name, data) {
    var queue = require('kue').createQueue();

    var job = queue.create(name, data)
    .delay(5000) // because the job could be queued while an object it depends upon hasn't been saved yet
    .attempts(3)
    .backoff({delay: 5000, type: 'exponential'});

    return Promise.promisify(job.save, job)();
  }
};