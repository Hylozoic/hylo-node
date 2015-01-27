module.exports = {

  index: function(req, res) {
    res.view('admin');
  },

  test: function(req, res) {
    var jobs = require('kue').createQueue();

      jobs.create('test', {
        title: 'My Very Own Test Job',
        factor: 'seven',
        arity: 'twelve',
        depth: 'quite in-'
      })
      .attempts(20)
      .backoff({delay: 1000, type: 'exponential'})
      .save(function(err) {
        if (err) return res.serverError(err);
        res.ok('testify!')
      });
  }

}